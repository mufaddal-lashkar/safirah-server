import { WebSocket } from "ws";

const socket = new WebSocket("ws://localhost:8080");

socket.on("open", () => {
    console.log("Connected to server");

    // Send SOS
    socket.send(JSON.stringify({ type: "sos", payload: { user: "Device123", msg: "HELP!" } }));
});

socket.on("message", (data) => {
    console.log("Received:", data.toString());
});
