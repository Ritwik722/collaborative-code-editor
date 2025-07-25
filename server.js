// In server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

// Initialize Express app and create HTTP server
const app = express();
const server = http.createServer(app);

// Integrate Socket.IO with the server
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Tell Express to serve static files from the 'public' directory
app.use(express.static('public'));

// Start the server
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

// Basic Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});