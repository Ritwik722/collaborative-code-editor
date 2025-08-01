// public/script.js
const socket = io();

let remoteCursors = {};
let remoteSelections = {};

const authContainer = document.getElementById('auth-container');
const lobbyContainer = document.getElementById('lobby-container');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomInput = document.getElementById('room-input');

const explainBtn = document.getElementById('explain-btn');
const aiModal = document.getElementById('ai-modal');
const aiResponseDiv = document.getElementById('ai-response');
const modalCloseBtn = document.querySelector('.modal-close');

// --- DOM Elements ---

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
    // This line is CRITICAL. It prevents the page from reloading.
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
            showLobby(); // This should transition to the lobby
        } else {
            Toastify({ text: "Login failed. Check username and password.", duration: 3000, gravity: "top", position: "right", backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)" }).showToast();
        }
    } catch (err) {
        console.error(err);
    }
});

joinRoomBtn.addEventListener('click', () => {
    const roomID = roomInput.value.trim();
    if (roomID) {
        // Hide the lobby and show the main app
        lobbyContainer.style.display = 'none';
        mainApp.style.display = 'flex';

        // Refresh the editor now that it's visible
        editor.refresh();

        // Emit the event to join the specific room
        socket.emit('join-room', { roomID, user: currentUser });
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
function showLobby() {
    authContainer.style.display = 'none';
    lobbyContainer.style.display = 'flex'; // Show the lobby
    mainApp.style.display = 'none'; // Keep the main app hidden for now
    userDisplay.textContent = `Welcome, ${currentUser.username}`;
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

socket.on('cursor-change', (data) => {
    const userId = data.user.id;
    if (userId === currentUser.id) return; // Don't render our own cursor

    if (remoteCursors[userId]) {
        remoteCursors[userId].clear(); // Clear the previous cursor marker
    }

    const cursorElement = document.createElement('div');
    cursorElement.className = 'remote-cursor';
    cursorElement.style.borderLeftColor = getUserColor(userId);

    const labelElement = document.createElement('div');
    labelElement.className = 'remote-cursor-label';
    labelElement.textContent = data.user.username;
    labelElement.style.backgroundColor = getUserColor(userId);
    cursorElement.appendChild(labelElement);

    remoteCursors[userId] = editor.setBookmark(data.from, { widget: cursorElement });
});

socket.on('selection-change', (data) => {
    const userId = data.user.id;
    if (userId === currentUser.id) return; // Don't render our own selection

    if (remoteSelections[userId]) {
        remoteSelections[userId].clear(); // Clear the previous selection marker
    }

    if (data) { // If there is a new selection to draw
        const color = getUserColor(userId);
        remoteSelections[userId] = editor.markText(data.from, data.to, {
            css: `background-color: ${color};`,
            className: 'remote-selection'
        });
    }
});

// --- AI Explanation Logic ---
explainBtn.addEventListener('click', async () => {
    const selectedCode = editor.getSelection(); // Get only the highlighted code
    if (!selectedCode) {
        Toastify({ text: "Please highlight some code to explain.", duration: 3000, gravity: "top", position: "right" }).showToast();
        return;
    }

    // Show the modal with a loading message
    aiResponseDiv.textContent = 'Thinking...';
    aiModal.style.display = 'flex';

    try {
        const res = await fetch('/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: selectedCode })
        });
        const data = await res.json();
        aiResponseDiv.textContent = data.explanation;
    } catch (err) {
        aiResponseDiv.textContent = 'Sorry, an error occurred.';
        console.error(err);
    }
});

// --- Modal Closing Logic ---
modalCloseBtn.addEventListener('click', () => {
    aiModal.style.display = 'none';
});

aiModal.addEventListener('click', (e) => {
    // Close modal if user clicks on the dark overlay
    if (e.target === aiModal) {
        aiModal.style.display = 'none';
    }
});
// --- Initialize Resizable Panes ---
Split(['#editor-pane', '#side-pane'], {
    sizes: [75, 25], // Initial sizes in percentage
    minSize: [400, 250], // Minimum size in pixels
    gutterSize: 8,
    cursor: 'col-resize',
    // This is a crucial step to fix line numbers when dragging
    onDrag: function() {
        editor.refresh();
    }
});

// public/script.js
let lastCursorEmit = 0;
editor.on('cursorActivity', () => {
    // Limit how often we send data to prevent flooding the server
    const now = Date.now();
    if (now - lastCursorEmit < 50) return;
    lastCursorEmit = now;

    // Send cursor position
    const cursor = editor.getCursor();
    socket.emit('cursor-change', { from: cursor });

    // Send selection, or send null to clear the selection
    if (editor.somethingSelected()) {
        const selection = editor.listSelections()[0];
        socket.emit('selection-change', { from: selection.anchor, to: selection.head });
    } else {
        socket.emit('selection-change', null);
    }
});

function getUserColor(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}