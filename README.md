# CodeCollab - Real-Time Collaborative Code Editor

CodeCollab is a feature-rich, full-stack web application that provides a real-time, collaborative coding environment. Built with Node.js and Socket.IO, it allows multiple users to join rooms, write and edit code together, and see each other's cursors and selections live. The application is enhanced with multi-language code execution and an integrated AI assistant to explain code snippets, making it a powerful tool for pair programming, interviews, and remote learning.

**[➡️ Live Demo Link]** `(<- Coming Soon....)`


## ✨ Core Features

* **Real-Time Collaborative Editing:** Multiple users can write and edit code in the same document simultaneously.
* **Live Cursors and Selections:** See the cursors and text selections of other users in the room in real-time, each with a unique color and name tag.
* **Multi-Language Code Execution:** Execute code in JavaScript, Python, and C++ directly in the editor and view the output, powered by the Judge0 API.
* **AI-Powered Code Explanation:** Highlight any snippet of code and get a simple, plain-English explanation of what it does, powered by the Google Gemini AI.
* **Full User Authentication:** Secure user registration and login system with persistent sessions.
* **Dynamic Room System:** Users can create new rooms or join existing ones through a lobby system after logging in.
* **Professional UI/UX:**
    * **Light/Dark Mode:** A theme toggle for user preference.
    * **Resizable Panes:** A draggable divider to resize the editor and side panel.
    * **Toast Notifications:** Modern, non-blocking notifications for a smoother user experience.

## 🛠️ Tech Stack

| Category          | Technologies                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Frontend** | HTML5, CSS3, JavaScript, [CodeMirror.js](https://codemirror.net/), [Socket.IO Client](https://socket.io/), [Toastify.js](https://github.com/apvarun/toastify-js), [Split.js](https://split.js.org/) |
| **Backend** | Node.js, Express.js, [Socket.IO](https://socket.io/), [Mongoose](https://mongoosejs.com/), [Passport.js](http://www.passportjs.org/), [bcrypt.js](https://github.com/dcodeIO/bcrypt.js), [axios](https://axios-http.com/), [dotenv](https://github.com/motdotla/dotenv) |
| **Database** | MongoDB (via MongoDB Atlas)                                                                            |
| **APIs & Services** | [Judge0 API](https://rapidapi.com/judge0-official/api/judge0-ce) (for Code Execution), [Google Gemini API](https://aistudio.google.com/) (for AI Explanation) |

---

## 🚀 Getting Started

Follow these steps to get the project running on your local machine.

### Prerequisites

* Node.js (v18 or later recommended)
* npm (Node Package Manager)
* Git

