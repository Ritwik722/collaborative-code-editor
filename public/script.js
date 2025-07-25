// public/script.js
const socket = io();

// --- DOM Elements ---
const joinScreen = document.getElementById('join-screen');
const mainApp = document.getElementById('main-app');
const joinBtn = document.getElementById('join-btn');
const roomIdInput = document.getElementById('room-id-input');
const chatInput = document.getElementById('chat-input');
const messagesDiv = document.getElementById('messages');

// --- Editor Setup ---
const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    lineNumbers: true,
    mode: 'javascript',
    theme: 'default'
});

let currentRoom = '';

// --- Event Handlers ---

// Handle Join Button Click
joinBtn.addEventListener('click', () => {
    const roomID = roomIdInput.value.trim();
    if (roomID) {
        currentRoom = roomID;
        socket.emit('join-room', roomID);
        
        // Hide join screen and show the main app
        joinScreen.style.display = 'none';
        mainApp.style.display = 'flex';
    }
});

// Send code changes
editor.on('change', (instance, change) => {
    if (change.origin !== 'setValue') {
        socket.emit('code-change', instance.getValue());
    }
});

// Send a chat message
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && chatInput.value) {
        socket.emit('send-message', chatInput.value);
        chatInput.value = '';
    }
});


// --- Socket Listeners ---

// Receive code updates
socket.on('code-update', (code) => {
    const cursorPos = editor.getCursor();
    editor.setValue(code);
    editor.setCursor(cursorPos);
});

// Receive a chat message
socket.on('receive-message', (data) => {
    const msgElement = document.createElement('div');
    // Display a snippet of the user ID
    const userDisplay = data.user.substring(0, 5); 
    msgElement.textContent = `${userDisplay}: ${data.text}`;
    messagesDiv.appendChild(msgElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});