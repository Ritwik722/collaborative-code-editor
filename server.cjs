// server.cjs

// 1. Load environment variables FIRST
require('dotenv').config();

// 2. Require all necessary packages
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require('./models/User');

// --- DATABASE CONNECTION ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
connectDB();

// --- INITIALIZE APP & SERVER ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- API CLIENT INITIALIZATION ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// --- MIDDLEWARES ---
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session Middleware
app.use(
    session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
    })
);

// Passport Middleware
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// --- HTTP ROUTES ---

// Register Route
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    User.findOne({ username: username }).then(user => {
        if (user) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const newUser = new User({ username, password });
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
                if (err) throw err;
                newUser.password = hash;
                newUser.save()
                    .then(user => res.status(201).json({ message: 'Registration successful' }))
                    .catch(err => console.log(err));
            });
        });
    });
});

// Login Route
app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) throw err;
        if (!user) return res.status(400).json({ message: 'No user exists or password incorrect' });
        req.logIn(user, (err) => {
            if (err) throw err;
            res.status(200).json({ message: 'Login successful', user: { id: user.id, username: user.username } });
        });
    })(req, res, next);
});

// Logout Route
app.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.status(200).json({ message: 'Logout successful' });
    });
});

// Code Execution Route
app.post('/execute', async (req, res) => {
    const { code, languageId } = req.body;
    const numericLanguageId = parseInt(languageId, 10);
    const submissionOptions = {
        method: 'POST',
        url: 'https://judge0-ce.p.rapidapi.com/submissions',
        params: { base64_encoded: 'false', fields: '*' },
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        data: { language_id: numericLanguageId, source_code: code }
    };
    try {
        const submissionResponse = await axios.request(submissionOptions);
        const token = submissionResponse.data.token;
        let resultResponse;
        do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const resultOptions = {
                method: 'GET',
                url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
                params: { base64_encoded: 'false', fields: '*' },
                headers: {
                    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                }
            };
            resultResponse = await axios.request(resultOptions);
        } while (resultResponse.data.status.id <= 2);
        res.json(resultResponse.data);
    } catch (error) {
        console.error("Error with Judge0 API:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Error executing code" });
    }
});

// AI Explanation Route
app.post('/explain', async (req, res) => {
    if (!genAI) return res.status(500).json({ message: "AI client not initialized" });
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "No code provided" });
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Explain the following code snippet in simple terms. Format the output neatly for a beginner:\n\n\`\`\`\n${code}\n\`\`\``;
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        res.json({ explanation: text });
    } catch (error) {
        console.error("Error with Google AI API:", error);
        res.status(500).json({ message: "Error getting explanation from AI" });
    }
});


// --- SOCKET.IO LOGIC ---
const rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', ({ roomID, user }) => {
        socket.join(roomID);
        socket.currentRoom = roomID;
        socket.currentUser = user;

        if (!rooms[roomID]) {
            rooms[roomID] = [];
        }
        rooms[roomID].push(user.username);
        console.log(`User ${user.username} joined room ${roomID}`);

        io.to(roomID).emit('update-user-list', rooms[roomID]);

        socket.on('code-change', (code) => {
            socket.to(socket.currentRoom).emit('code-update', code);
        });

        socket.on('send-message', (message) => {
            io.to(socket.currentRoom).emit('receive-message', { user: socket.currentUser.username, text: message });
        });

        socket.on('cursor-change', (cursorData) => {
            socket.to(socket.currentRoom).emit('cursor-change', { ...cursorData, user: socket.currentUser });
        });

        socket.on('selection-change', (selectionData) => {
            socket.to(socket.currentRoom).emit('selection-change', { ...selectionData, user: socket.currentUser });
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomID = socket.currentRoom;
        if (roomID && rooms[roomID] && socket.currentUser) {
            rooms[roomID] = rooms[roomID].filter(username => username !== socket.currentUser.username);
            io.to(roomID).emit('update-user-list', rooms[roomID]);
        }
    });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});