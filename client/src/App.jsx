import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        socket.on("chatMessage", (message) => {
            setMessages((previousMessages) => [
                ...previousMessages,
                message
            ]);
        });

        return () => {
            socket.off("chatMessage");
        };
    }, []);

    const sendMessage = () => {
        if (message.trim() === "") {
            return;
        }

        socket.emit("chatMessage", message);
        setMessage("");
    };

    return (
        <div>
            <h1>Real-Time Chat</h1>

            <div>
                {messages.map((msg, index) => (
                    <p key={index}>{msg}</p>
                ))}
            </div>

            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        sendMessage();
                    }
                }}
                placeholder="Type a message..."
            />

            <button onClick={sendMessage}>
                Send
            </button>
        </div>
    );
}

export default App;