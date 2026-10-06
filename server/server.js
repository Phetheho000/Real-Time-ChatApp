const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

// Allow requests from React
app.use(cors());

// Create a HTTP server from Express
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
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

// Socket.IO connection
io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    // Receive chat message
    socket.on("chatMessage", (message) => {

        console.log("Message received:", message);

        // Send message to all connected users
        io.emit("chatMessage", message);
    });

    // User disconnects
    socket.on("disconnect", () => {

        console.log("User disconnected:", socket.id);
    });
});

// Start server
const PORT = 5000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});