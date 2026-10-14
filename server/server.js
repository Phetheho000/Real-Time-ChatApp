const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const pool = require("./database");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Store connected users: socket ID -> username
const onlineUsers = new Map();

app.get("/", (req, res) => {
    res.send("Chat server is running");
});

// Send the current online-user list to everyone
function updateOnlineUsers() {
    const users = [...new Set(onlineUsers.values())];

    io.emit("onlineUsers", users);
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Register a username when a user logs in
    socket.on("userOnline", (username) => {
        if (typeof username !== "string") {
            return;
        }

        username = username.trim().slice(0, 20);

        if (!username) {
            return;
        }

        onlineUsers.set(socket.id, username);

        console.log(`${username} is online`);

        updateOnlineUsers();
    });

 // Receive, save, and broadcast chat messages
    socket.on("chatMessage", async (message) => {
        if (
            !message ||
            typeof message.username !== "string" ||
            typeof message.text !== "string"
        ) {
            return;
        }

        const username = (
            onlineUsers.get(socket.id) || message.username
        ).trim().slice(0, 20);

        const text = message.text.trim().slice(0, 2000);

        if (!username || !text) {
            return;
        }

        try {
            // Save the message to PostgreSQL
            const result = await pool.query(
                `INSERT INTO messages (username, message_text)
                 VALUES ($1, $2)
                 RETURNING id, username, message_text, created_at`,
                [username, text]
            );

            const row = result.rows[0];

            // Prepare the saved message for the chat
            const chatMessage = {
                id: row.id,
                username: row.username,
                text: row.message_text,
                time: new Date(row.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            };

            // Broadcast only after PostgreSQL saves it
            io.emit("chatMessage", chatMessage);

            console.log("Message saved to PostgreSQL:", text);

        } catch (error) {
            console.error("Failed to save message:", error.message);

            socket.emit(
                "messageError",
                "Your message could not be saved. Please try again."
            );
        }
    });

    //Notify other users when someone start typing 
    socket.on("typing", () => {
        const username = onlineUsers.get(socket.id);

        if (username) {
            socket.broadcast.emit("typing", username);
        }
    });

    //Notify other users when someone stops typing
    socket.on("stopTyping", () => {
        const username = onlineUsers.get(socket.id);

        if (username) {
            socket.broadcast.emit("stopTyping", username);
        }
    });

    // Remove the user when they disconnect
    socket.on("disconnect", () => {
        const username = onlineUsers.get(socket.id);

        onlineUsers.delete(socket.id);

        if (username) {
            console.log(`${username} went offline`);
            updateOnlineUsers();
        }

        if (username) {
            socket.broadcast.emit("stopTyping", username);
        }

        console.log("User disconnected:", socket.id);
    });
});

const PORT = 5000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});