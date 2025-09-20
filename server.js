import { WebSocketServer } from "ws";

// Start WebSocket server on port 8080
const wss = new WebSocketServer({ port: 8080 });

console.log("🚀 SOS WebSocket server running on ws://localhost:8080");

// Keep track of connected clients
let clients = [];

wss.on("connection", (ws) => {
    console.log("✅ Device connected");
    clients.push(ws);

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        // If device sends SOS
        if (data.type === "sos") {
            console.log("🚨 SOS Triggered:", data.payload);

            // Broadcast to all other connected devices
            clients.forEach((client) => {
                if (client !== ws && client.readyState === ws.OPEN) {
                    client.send(
                        JSON.stringify({
                            type: "sos-alert",
                            payload: data.payload, // location, userId etc.
                        })
                    );
                }
            });
        }
    });

    ws.on("close", () => {
        console.log("❌ Device disconnected");
        clients = clients.filter((client) => client !== ws);
    });
});
