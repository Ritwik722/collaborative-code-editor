// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a user wants to join a room
    socket.on('join-room', (roomID) => {
        socket.join(roomID);
        console.log(`User ${socket.id} joined room ${roomID}`);

        // Listen for code changes within the room
        socket.on('code-change', (code) => {
            // Broadcast only to others in the same room
            socket.to(roomID).emit('code-update', code);
        });

        // Listen for chat messages within the room
        socket.on('send-message', (message) => {
            // Broadcast to everyone in the room (including sender)
            io.to(roomID).emit('receive-message', { user: socket.id, text: message });
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});