import express from "express";
import cors from "cors";
import dotenv from "dotenv"

import userRoutes from "./routes/userRoutes.js"
import incidentRoutes from "./routes/incidentRoutes.js"
import connectDB from "./utils/dbConnect.js";

const app = express();
dotenv.config();
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());

// routes
app.use("/api/users", userRoutes);
app.use("/api/incidents", incidentRoutes);

// Example route
app.get("/", (req, res) => {
    res.send("🚀 REST API is running!");
});

export default app;
