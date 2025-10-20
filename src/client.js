import { WebSocket } from "ws";

const socket = new WebSocket("wss://safirah-server.onrender.com");

socket.on("open", () => {
    console.log("Connected to server");
    const location = {
        lat: 23.0225,
        lng: 72.5714,
        area: "gota",
        city: "Ahmedabad",
    };

    // Send SOS
    socket.send(JSON.stringify({
        type: "sos", payload: {
            sosId: "1hvebdb21i38965",
            userId: "user_123",
            username: "Mufaddal",
            timestamp: Date.now(),
            location: location,
            device_info: {
                model: "redmi 10c",
                platform: "android",
                battery: "52",
            },
            message: "Need urgent help!",
        }
    }));
    console.log("Data sent :: ", location);
});

socket.on("message", (data) => {
    console.log("Received:", data.toString());
});
