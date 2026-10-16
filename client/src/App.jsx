
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000", {
    autoConnect: false
});

function App() {
    const [username, setUsername] = useState(
        () => localStorage.getItem("chatUsername") || ""
    );

    const [token, setToken] = useState(
        () => localStorage.getItem("chatToken") || ""
    );

    const [loggedIn, setLoggedIn] = useState(
        () => Boolean(
            localStorage.getItem("chatToken") &&
            localStorage.getItem("chatUsername")
        )
    );

    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState("");
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const typingTimer = useRef(null);

    // Listen for chat updates
    useEffect(() => {
        const receiveMessage = (data) => {
            setMessages((previous) => [...previous, data]);
        };

        const receiveOnlineUsers = (users) => {
            setOnlineUsers(users);
        };

        const receiveTyping = (typingUsername) => {
            setTypingUsers((previous) =>
                previous.includes(typingUsername)
                    ? previous
                    : [...previous, typingUsername]
            );
        };

        const receiveStopTyping = (typingUsername) => {
            setTypingUsers((previous) =>
                previous.filter((user) => user !== typingUsername)
            );
        };

        const receiveMessageHistory = (history) => {
            setMessages(history);
        };

        socket.on("chatMessage", receiveMessage);
        socket.on("onlineUsers", receiveOnlineUsers);
        socket.on("typing", receiveTyping);
        socket.on("stopTyping", receiveStopTyping);
        socket.on("messageHistory", receiveMessageHistory);

        return () => {
            socket.off("chatMessage", receiveMessage);
            socket.off("onlineUsers", receiveOnlineUsers);
            socket.off("typing", receiveTyping);
            socket.off("stopTyping", receiveStopTyping);
            socket.off("messageHistory", receiveMessageHistory);
        };
    }, []);

    // Connect after login and provide the JWT token
    useEffect(() => {
        if (loggedIn && username && token) {
            socket.auth = { token };

            if (!socket.connected) {
                socket.connect();
            }

            // The server will be updated to verify this identity next.
            socket.emit("userOnline", username);
        }
    }, [loggedIn, username, token]);

    // Register or log in
    const handleAuthentication = async (event) => {
        event.preventDefault();
        setError("");

        const cleanEmail = email.trim().toLowerCase();
        const cleanUsername = username.trim();

        if (!cleanEmail || !password) {
            setError("Please enter your email and password.");
            return;
        }

        if (isRegistering && !cleanUsername) {
            setError("Please enter a username.");
            return;
        }

        setIsSubmitting(true);

        try {
            const endpoint = isRegistering
                ? "/api/auth/register"
                : "/api/auth/login";

            const body = isRegistering
                ? {
                    username: cleanUsername,
                    email: cleanEmail,
                    password
                }
                : {
                    email: cleanEmail,
                    password
                };

            const response = await fetch(
                `http://localhost:5000${endpoint}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Authentication failed."
                );
            }

            // Save the authenticated account details
            localStorage.setItem("chatToken", data.token);
            localStorage.setItem("chatUsername", data.user.username);

            setToken(data.token);
            setUsername(data.user.username);
            setPassword("");
            setError("");
            setLoggedIn(true);
        } catch (err) {
            setError(
                err.message ||
                "Could not connect to the server. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Send a chat message
    const sendMessage = (event) => {
        event.preventDefault();

        const cleanMessage = message.trim();

        if (!cleanMessage || !socket.connected) {
            return;
        }

        clearTimeout(typingTimer.current);
        socket.emit("stopTyping");

        socket.emit("chatMessage", {
            username,
            text: cleanMessage
        });

        setMessage("");
    };

    // Log out
    const logout = () => {
        clearTimeout(typingTimer.current);
        socket.disconnect();

        localStorage.removeItem("chatToken");
        localStorage.removeItem("chatUsername");

        setToken("");
        setUsername("");
        setEmail("");
        setPassword("");
        setLoggedIn(false);
        setMessages([]);
        setMessage("");
        setOnlineUsers([]);
        setTypingUsers([]);
        setError("");
    };

    // Registration and login screen
    if (!loggedIn) {
        return (
            <main className="login-page">
                <form
                    className="login-card"
                    onSubmit={handleAuthentication}
                >
                    <div className="brand-icon">💬</div>

                    <h1>Welcome to ChatRoom</h1>

                    <p className="subtitle">
                        {isRegistering
                            ? "Create your account to get started."
                            : "Sign in to continue your conversations."}
                    </p>

                    {isRegistering && (
                        <>
                            <label htmlFor="username">
                                Username
                            </label>

                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(event) =>
                                    setUsername(event.target.value)
                                }
                                placeholder="Choose a username"
                                minLength={3}
                                maxLength={20}
                                autoComplete="username"
                                required
                            />
                        </>
                    )}

                    <label htmlFor="email">Email address</label>

                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(event.target.value)
                        }
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                    />

                    <label htmlFor="password">Password</label>

                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                        placeholder="Enter your password"
                        minLength={8}
                        maxLength={72}
                        autoComplete={
                            isRegistering
                                ? "new-password"
                                : "current-password"
                        }
                        required
                    />

                    {error && (
                        <p className="error">{error}</p>
                    )}

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={isSubmitting}
                    >
                        {isSubmitting
                            ? "Please wait..."
                            : isRegistering
                                ? "Create Account"
                                : "Log In"}
                    </button>

                    <p className="login-note">
                        {isRegistering
                            ? "Already have an account?"
                            : "Don't have an account yet?"}
                        {" "}
                        <button
                            type="button"
                            className="auth-switch"
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError("");
                            }}
                        >
                            {isRegistering
                                ? "Log in"
                                : "Register"}
                        </button>
                    </p>
                </form>
            </main>
        );
    }

    // Chat screen
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
                        onClick={logout}
                    >
                        Log out
                    </button>
                </header>

                <div className="connection-status">
                    <span
                        className={
                            socket.connected
                                ? "status-dot online"
                                : "status-dot"
                        }
                    />
                    {socket.connected
                        ? "Connected"
                        : "Connecting..."}
                </div>

                <aside className="online-users">
                    <h3>
                        Online Users
                        <span className="online-count">
                            {onlineUsers.length}
                        </span>
                    </h3>

                    {onlineUsers.length === 0 ? (
                        <p className="no-users">
                            No users online
                        </p>
                    ) : (
                        <ul>
                            {onlineUsers.map((user) => (
                                <li key={user}>
                                    <span className="user-status-dot" />
                                    {user === username
                                        ? `${user} (You)`
                                        : user}
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
                            <p>
                                Say hello to start the conversation!
                            </p>
                        </div>
                    )}

                    {messages.map((msg, index) => {
                        const ownMessage =
                            msg.username === username;

                        return (
                            <div
                                key={msg.id ?? `${index}-${msg.time}`}
                                className={`message-row ${
                                    ownMessage ? "own-message" : ""
                                }`}
                            >
                                <div className="message-bubble">
                                    <div className="message-author">
                                        {ownMessage
                                            ? "You"
                                            : msg.username}
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

                    {typingUsers.filter(
                        (user) => user !== username
                    ).length > 0 && (
                        <div className="typing-indicator">
                            <span className="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>

                            {typingUsers
                                .filter((user) => user !== username)
                                .join(", ")}

                            {typingUsers.filter(
                                (user) => user !== username
                            ).length === 1
                                ? " is typing..."
                                : " are typing..."}
                        </div>
                    )}
                </div>

                <form
                    className="message-form"
                    onSubmit={sendMessage}
                >
                    <input
                        type="text"
                        value={message}
                        onChange={(event) => {
                            const value = event.target.value;
                            setMessage(value);

                            clearTimeout(typingTimer.current);

                            if (value.trim()) {
                                socket.emit("typing");

                                typingTimer.current = setTimeout(
                                    () => {
                                        socket.emit("stopTyping");
                                    },
                                    2000
                                );
                            } else {
                                socket.emit("stopTyping");
                            }
                        }}
                        placeholder="Type your message..."
                    />

                    <button
                        type="submit"
                        className="primary-button"
                    >
                        Send
                    </button>
                </form>
            </section>
        </main>
    );
}

export default App;
