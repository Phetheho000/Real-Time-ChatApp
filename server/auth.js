const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./database");

const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Please provide a username, email, and password."
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length < 3 || cleanUsername.length > 20) {
            return res.status(400).json({
                message: "Username must be between 3 and 20 characters."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                message: "Password must be between 8 and 72 characters."
            });
        }

        // Check whether the username or email is already registered
        const existingUser = await pool.query(
            `SELECT id FROM users
             WHERE LOWER(username) = LOWER($1) OR email = $2`,
            [cleanUsername, cleanEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "That username or email is already registered."
            });
        }

        // Hash the password before saving it
        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, username, email`,
            [cleanUsername, cleanEmail, passwordHash]
        );

        const user = result.rows[0];

        const token = jwt.sign(
            { userId: user.id.toString(), username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.status(201).json({
            message: "Account created successfully.",
            token,
            user
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "That username or email is already registered."
            });
        }

        console.error("Registration error:", error.message);
        return res.status(500).json({
            message: "Could not create your account."
        });
    }
});

// Log in an existing user
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Please enter your email and password."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const result = await pool.query(
            `SELECT id, username, email, password_hash
             FROM users
             WHERE email = $1`,
            [cleanEmail]
        );

        const user = result.rows[0];

        // Use the same error for an unknown email or incorrect password
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            { userId: user.id.toString(), username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({
            message: "Could not log in. Please try again."
        });
    }
});

module.exports = router;