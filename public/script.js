// public/script.js

// Initialize the CodeMirror editor on our textarea
const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    lineNumbers: true,
    mode: 'javascript', // Set the language mode
    theme: 'default' // You can explore other themes
});