import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000", {
    autoConnect: false
});

function App() {
    const [username, setUsername] = useState("");
    const [loggedIn, setLoggedIn] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState("");
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);

useEffect(() => {
    // Listen for new chat messages
    const receiveMessage = (data) => {
        setMessages((previousMessages) => [
            ...previousMessages,
            data
        ]);
    };

    // Listen for online users
    const receiveOnlineUsers = (users) => {
        setOnlineUsers(users);
    };

    // Listen when someone starts typing
    const receiveTyping = (typingUsername) => {
        setTypingUsers((previousUsers) =>
            previousUsers.includes(typingUsername)
                ? previousUsers
                : [...previousUsers, typingUsername]
        );
    };

    // Listen when someone stops typing
    const receiveStopTyping = (typingUsername) => {
        setTypingUsers((previousUsers) =>
            previousUsers.filter((user) => user !== typingUsername)
        );
    };

    // Register all listeners
    socket.on("chatMessage", receiveMessage);
    socket.on("onlineUsers", receiveOnlineUsers);
    socket.on("typing", receiveTyping);
    socket.on("stopTyping", receiveStopTyping);

    // Remove listeners when the component unmounts
    return () => {
        socket.off("chatMessage", receiveMessage);
        socket.off("onlineUsers", receiveOnlineUsers);
        socket.off("typing", receiveTyping);
        socket.off("stopTyping", receiveStopTyping);
    };
}, []);

    const login = (event) => {
        event.preventDefault();

        const cleanUsername = username.trim();

        if (!cleanUsername) {
            setError("Please enter a username.");
            return;
        }

        setUsername(cleanUsername);
        setError("");
        setLoggedIn(true);

        if (!socket.connected) {
            socket.connect();
        }

        socket.emit("userOnline", cleanUsername);
    };

const sendMessage = (event) => {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (!cleanMessage || !socket.connected) {
        return;
    }

    socket.emit("chatMessage", {
        username,
        text: cleanMessage
    });

    setMessage("");
};

    if (!loggedIn) {
        return (
            <main className="login-page">
                <form className="login-card" onSubmit={login}>
                    <div className="brand-icon">💬</div>

                    <h1>Welcome to ChatRoom</h1>
                    <p className="subtitle">
                        Your conversations start here.
                    </p>

                    <label htmlFor="username">Choose a username</label>

                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="e.g. Alex"
                        maxLength={20}
                        autoComplete="username"
                        autoFocus
                    />

                    {error && <p className="error">{error}</p>}

                    <button type="submit" className="primary-button">
                        Join Chat
                    </button>

                    <p className="login-note">
                        No password required for this demo.
                    </p>
                </form>
            </main>
        );
    }

    return (
        <main className="chat-page">
            <section className="chat-card">
                <header className="chat-header">
                    <div>
                        <h1>ChatRoom</h1>
                        <p>Signed in as {username}</p>
                    </div>

                    <button
                        className="logout-button"
                        onClick={() => {
                            socket.disconnect();
                            setLoggedIn(false);
                            setMessages([]);
                            setMessage("");
                        }}
                    >
                        Log out
                    </button>
                </header>

                <div className="connection-status">
                    <span className={socket.connected ? "status-dot online" : "status-dot"} />
                    {socket.connected ? "Connected" : "Connecting..."}
                </div>

                <aside className="online-users">
                    <h3>
                        Online Users
                        <span className="online-count">{onlineUsers.length}</span>
                    </h3>

                    {onlineUsers.length === 0 ? (
                        <p className="no-users">No users online</p>
                    ) : (
                        <ul>
                            {onlineUsers.map((user) => (
                                <li key={user}>
                                    <span className="user-status-dot"></span>
                                    {user === username ? `${user} (You)` : user}
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>

                <div className="messages">
                    {messages.length === 0 && (
                        <div className="empty-chat">
                            <span>👋</span>
                            <p>No messages yet.</p>
                            <p>Say hello to start the conversation!</p>
                        </div>
                    )}

                    {messages.map((msg, index) => {
                        const ownMessage = msg.username === username;

                        return (
                            <div
                                key={`${index}-${msg.time}`}
                                className={`message-row ${ownMessage ? "own-message" : ""}`}
                            >
                                <div className="message-bubble">
                                    <div className="message-author">
                                        {ownMessage ? "You" : msg.username}
                                    </div>

                                    <div className="message-text">
                                        {msg.text}
                                    </div>

                                    <div className="message-time">
                                        {msg.time}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {typingUsers.filter((user) => user !== username).length > 0 && (
                        <div className="typing-indicator">
                            <span className="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>

                            {typingUsers
                                .filter((user) => user !== username)
                                .join(", ")}
                            {typingUsers.filter((user) => user !== username).length === 1
                                ? " is typing..."
                                : " are typing..."}
                        </div>
)}
                </div>

                <form className="message-form" onSubmit={sendMessage}>
                    <input
                        type="text"
                        value={message}
                        onChange={(event) => {
                            const value = event.target.value;
                            setMessage(value);

                            if (value.trim()) {
                                socket.emit("typing");
                            } else {
                                socket.emit("stopTyping");
                            }
                        }}
                        placeholder="Type your message..."
                    />

                    <button type="submit" className="primary-button">
                        Send
                    </button>
                </form>
            </section>
        </main>
    );
}

export default App;