// public/script.js
const socket = io();

// --- DOM Elements ---
const authContainer = document.getElementById('auth-container');
const mainApp = document.getElementById('main-app');
const languageSelect = document.getElementById('language-select');
// --- Get DOM Elements for this feature ---
const runBtn = document.getElementById('run-btn');
const outputBox = document.getElementById('output-box');


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

        // REPLACED ALERT WITH TOASTIFY
        if (res.status === 201) {
            Toastify({ text: "Registration successful! Please log in.", duration: 3000, gravity: "top", position: "right", backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)" }).showToast();
            showLoginLink.click();
        } else {
            Toastify({ text: data.message, duration: 3000, gravity: "top", position: "right", backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)" }).showToast();
        }
    } catch (err) {
        console.error(err);
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
            // REPLACED ALERT WITH TOASTIFY
            Toastify({ text: "Login failed. Check username and password.", duration: 3000, gravity: "top", position: "right", backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)" }).showToast();
        }
    } catch (err) {
        console.error(err);
    }
});
// --- Logout Handler ---
logoutBtn.addEventListener('click', async () => {
    await fetch('/logout');
    currentUser = null;
    authContainer.style.display = 'flex';
    mainApp.style.display = 'none';
});

// --- Run Code Handler ---
runBtn.addEventListener('click', async () => {
    const code = editor.getValue();
    const languageId = languageSelect.value;
    if (!code) return;

    outputBox.textContent = 'Running...';

    try {
        // Send both code and languageId to the backend
        const res = await fetch('/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, languageId: languageId })
        });

        const result = await res.json();

         if (result.stdout) {
            outputBox.textContent = result.stdout;
        } else if (result.stderr) {
            // Display stderr if stdout is empty (common for console.log)
            outputBox.textContent = result.stderr;
        } else if (result.compile_output) {
            outputBox.textContent = `Compilation Error:\n${result.compile_output}`;
        } else {
            outputBox.textContent = 'Execution finished with no output.';
        }

    } catch (err) {
        console.error(err);
        outputBox.textContent = 'An error occurred while running the code.';
    }
});
// Add this new listener somewhere with your other event listeners
languageSelect.addEventListener('change', () => {
    const languageMap = {
        '93': 'javascript',
        '71': 'python',
        '54': 'text/x-c++src' // CodeMirror mode for C++
    };
    const mode = languageMap[languageSelect.value];
    editor.setOption("mode", mode);
});

// --- Main App Logic ---
function enterMainApp() {
    authContainer.style.display = 'none';
    mainApp.style.display = 'flex';
    userDisplay.textContent = `Welcome, ${currentUser.username}`;

    // Add this line to fix the line number bug
    editor.refresh();

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

const themeCheckbox = document.getElementById('theme-checkbox');

themeCheckbox.addEventListener('change', () => {
    // Toggle the .dark-mode class on the body
    document.body.classList.toggle('dark-mode');

    // Change the CodeMirror editor theme
    if (themeCheckbox.checked) {
        editor.setOption('theme', 'material-darker');
    } else {
        editor.setOption('theme', 'default');
    }
});

socket.on('code-update', (code) => {
    const cursorPos = editor.getCursor();
    editor.setValue(code);
    editor.setCursor(cursorPos);
});

socket.on('receive-message', (data) => {
    const msgElement = document.createElement('div');
    // No need to shorten the username anymore
    msgElement.textContent = `${data.user}: ${data.text}`;
    messagesDiv.appendChild(msgElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('update-user-list', (users) => {
    userList.innerHTML = ''; // Clear the current list
    users.forEach(username => {
        const li = document.createElement('li');
        // No need to shorten the username anymore
        li.textContent = username;
        userList.appendChild(li);
    });
});