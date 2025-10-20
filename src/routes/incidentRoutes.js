import express from "express"
import { fetchIncidents, reportIncident } from "../controllers/incidentController.js"
import { authenticateUser } from "../utils/verifyToken.js";
import upload from "../utils/multer.js"

const router = express.Router();

router.post("/report", authenticateUser,upload.single('file'), reportIncident);
router.get("/fetch", authenticateUser, fetchIncidents)


export default router;