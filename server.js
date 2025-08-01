
const mongoose = require('mongoose');

const axios = require('axios');

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyANS_q2t6Ck9zPy6_eXfk02Buj7Jv2ZOxk");

// --- Database Connection ---


const connectDB = async () => {
    try {
        const conn = await mongoose.connect("mongodb+srv://ritwiksune:100804@cluster0.rrlwuoq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

connectDB(); // Call the function to connect

// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const rooms = {}; // This will store our room data

const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const User = require('./models/User');

const bcrypt = require('bcryptjs');

app.use(express.static('public'));

// Passport Config
require('./config/passport')(passport);

// Add this block BEFORE your io.on('connection', ...)
// --- Sessions and Auth ---
app.use(express.json()); // To accept JSON data in POST requests
app.use(express.urlencoded({ extended: false })); // To accept form data

app.use(
    session({
        secret: 'keyboard cat', // Replace with a real secret in production
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: "mongodb+srv://ritwiksune:100804@cluster0.rrlwuoq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" })
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// --- Authentication Routes ---

// Register
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    User.findOne({ username: username }).then(user => {
        if (user) {
            res.status(400).json({ message: 'Username already exists' });
        } else {
            const newUser = new User({
                username,
                password
            });

            // Hash password before saving
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                    if (err) throw err;
                    newUser.password = hash;
                    newUser
                        .save()
                        .then(user => {
                            res.status(201).json({ message: 'Registration successful' });
                        })
                        .catch(err => console.log(err));
                });
            });
        }
    });
});

// Login
app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) throw err;
        if (!user) return res.status(400).json({ message: 'No user exists' });
        req.logIn(user, (err) => {
            if (err) throw err;
            res.status(200).json({ message: 'Login successful', user: { id: user.id, username: user.username } });
        });
    })(req, res, next);
});

// Logout
app.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.status(200).json({ message: 'Logout successful' });
    });
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', ({ roomID, user }) => {
    socket.join(roomID);
    socket.currentRoom = roomID;
    socket.currentUser = user; // Store the user object on the socket

    // Add user to our room tracker
    if (!rooms[roomID]) {
        rooms[roomID] = [];
    }
    // Let's store the username instead of the ID
    rooms[roomID].push(user.username);
    console.log(`User ${user.username} joined room ${roomID}`);

    // Broadcast the updated user list to everyone in the room
    io.to(roomID).emit('update-user-list', rooms[roomID]);

        socket.on('code-change', (code) => {
            socket.to(roomID).emit('code-update', code);
        });

        socket.on('send-message', (message) => {
            // Send the username instead of the socket.id
            io.to(socket.currentRoom).emit('receive-message', { user: socket.currentUser.username, text: message });
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomID = socket.currentRoom;
        // Check if the user and room exist before trying to modify
        if (roomID && rooms[roomID] && socket.currentUser) {
            // Remove the username from the room tracker
            rooms[roomID] = rooms[roomID].filter(username => username !== socket.currentUser.username);
            // Broadcast the updated user list
            io.to(roomID).emit('update-user-list', rooms[roomID]);
        }
    });
});

app.post('/execute', async (req, res) => {
    // Get code and languageId from the request
    const { code, languageId } = req.body;

    // Convert languageId from a string to a number
    const numericLanguageId = parseInt(languageId, 10);

    // --- FIRST REQUEST (to create the submission) ---
    const submissionOptions = {
        method: 'POST',
        url: 'https://judge0-ce.p.rapidapi.com/submissions',
        params: { base64_encoded: 'false', fields: '*' },
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': '50ecf0364emsh5e56d87a056faffp1da61ejsnf48d27fcb81b', // Make sure your key is here
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        data: {
            // Use the numericLanguageId here
            language_id: numericLanguageId,
            source_code: code,
        }
    };

    try {
        const submissionResponse = await axios.request(submissionOptions);
        const token = submissionResponse.data.token;

        // --- SECOND REQUEST (to get the result) ---
        let resultResponse;
        do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const resultOptions = {
                method: 'GET',
                url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
                params: { base64_encoded: 'false', fields: '*' },
                headers: {
                    'X-RapidAPI-Key': '50ecf0364emsh5e56d87a056faffp1da61ejsnf48d27fcb81b', // Make sure your key is here too
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

app.post('/explain', async (req, res) => {
    // IMPORTANT: Make sure you have initialized genAI with your API key
    if (!genAI) {
        return res.status(500).json({ message: "AI client not initialized" });
    }

    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ message: "No code provided" });
    }

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

server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});