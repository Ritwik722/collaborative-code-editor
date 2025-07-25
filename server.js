
const mongoose = require('mongoose');

// --- Database Connection ---
// server.js

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
            io.to(roomID).emit('receive-message', { user: socket.id, text: message });
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomID = socket.currentRoom;
        if (roomID && rooms[roomID]) {
            // Remove user from room tracker
            rooms[roomID] = rooms[roomID].filter(id => id !== socket.id);
            // Broadcast the updated list
            io.to(roomID).emit('update-user-list', rooms[roomID]);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});