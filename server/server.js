const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

// Allow requests from React
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Test route
app.get("/", (req, res) => {
    res.send("Chat server is running");
});

// Handle Socket.IO connections
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Receive and broadcast messages
    socket.on("chatMessage", (message) => {
        if (
            !message ||
            typeof message.username !== "string" ||
            typeof message.text !== "string"
        ) {
            return;
        }

        const username = message.username.trim().slice(0, 20);
        const text = message.text.trim().slice(0, 2000);

        // Reject empty messages
        if (!username || !text) {
            return;
        }

        // Create the message on the server
        const chatMessage = {
            username,
            text,
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            })
        };

        console.log("Message received:", chatMessage);

        // Broadcast the message exactly once
        io.emit("chatMessage", chatMessage);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Start server
const PORT = 5000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});