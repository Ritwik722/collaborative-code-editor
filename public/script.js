// public/script.js
const socket = io();

// --- DOM Elements ---
const authContainer = document.getElementById('auth-container');
const mainApp = document.getElementById('main-app');

// Auth forms
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');

// Main app elements
const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');
const chatInput = document.getElementById('chat-input');
const messagesDiv = document.getElementById('messages');
const userList = document.getElementById('user-list');

// --- Editor Setup ---
const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    lineNumbers: true,
    mode: 'javascript',
    theme: 'default'
});

// --- App State ---
let currentUser = null;

// --- Auth Form Toggling ---
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormContainer.style.display = 'none';
    registerFormContainer.style.display = 'block';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerFormContainer.style.display = 'none';
    loginFormContainer.style.display = 'block';
});

// --- Registration Handler ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    try {
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.status === 201) {
            alert('Registration successful! Please log in.');
            showLoginLink.click(); // Switch to login form
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred.');
    }
});

// --- Login Handler ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            enterMainApp();
        } else {
            alert('Login failed. Check username and password.');
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred.');
    }
});

// --- Logout Handler ---
logoutBtn.addEventListener('click', async () => {
    await fetch('/logout');
    currentUser = null;
    authContainer.style.display = 'flex';
    mainApp.style.display = 'none';
});


// --- Main App Logic ---
function enterMainApp() {
    authContainer.style.display = 'none';
    mainApp.style.display = 'flex';
    userDisplay.textContent = `Welcome, ${currentUser.username}`;

    // For now, let's hardcode a room. You can build a room selection UI later.
    const roomID = 'general-room';
    socket.emit('join-room', { roomID, user: currentUser });
}


// --- Socket Listeners (To be updated later to use username) ---
editor.on('change', (instance, change) => {
    if (change.origin !== 'setValue') {
        socket.emit('code-change', instance.getValue());
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && chatInput.value) {
        socket.emit('send-message', chatInput.value);
        chatInput.value = '';
    }
});

socket.on('code-update', (code) => {
    const cursorPos = editor.getCursor();
    editor.setValue(code);
    editor.setCursor(cursorPos);
});

socket.on('receive-message', (data) => {
    const msgElement = document.createElement('div');
    const userDisplay = data.user.substring(0, 5); 
    msgElement.textContent = `${userDisplay}: ${data.text}`;
    messagesDiv.appendChild(msgElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('update-user-list', (users) => {
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.substring(0, 5);
        userList.appendChild(li);
    });
});