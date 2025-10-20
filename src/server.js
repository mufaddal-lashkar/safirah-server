// import { WebSocketServer } from "ws";

// // Start WebSocket server on port 8080
// const port = process.env.PORT || 8080;
// const wss = new WebSocketServer({ port: port });

// console.log("🚀 SOS WebSocket server running on ws://localhost:8080");

// // Keep track of connected clients
// let clients = [];

// wss.on("connection", (ws) => {
//     console.log("✅ Device connected");
//     clients.push(ws);

//     ws.on("message", (message) => {
//         const data = JSON.parse(message);

//         // If device sends SOS
//         if (data.type === "sos") {
//             console.log("🚨 SOS Triggered:", data.payload);

//             // Broadcast to all other connected devices
//             clients.forEach((client) => {
//                 if (client !== ws && client.readyState === ws.OPEN) {
//                     client.send(
//                         JSON.stringify({
//                             type: "sos-alert",
//                             payload: data.payload, // location, userId etc.
//                         })
//                     );
//                 }
//             });
//         }
//     });

//     ws.on("close", () => {
//         console.log("❌ Device disconnected");
//         clients = clients.filter((client) => client !== ws);
//     });
// });

import http from "http";
import { WebSocketServer } from "ws";
import app from "./app.js";

const port = process.env.PORT || 8080;

// Create a single HTTP server for both Express + WebSocket
const server = http.createServer(app);

// Attach WebSocket server
const wss = new WebSocketServer({ server });

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`🌐 WebSocket active on ws://localhost:${port}`);

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

            // Broadcast to all other connected clients
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

// Start server (both REST + WebSocket)
server.listen(port, "0.0.0.0", () => {
    console.log(`✅ Listening on port ${port}`);
});
