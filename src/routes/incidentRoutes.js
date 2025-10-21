import express from "express"
import { addComment, fetchComments, fetchIncidents, reportIncident, voteIncident } from "../controllers/incidentController.js"
import { authenticateUser } from "../utils/verifyToken.js";
import upload from "../utils/multer.js"

const router = express.Router();

router.post("/report", authenticateUser,upload.single('file'), reportIncident);
router.get("/fetch", authenticateUser, fetchIncidents)
router.post("/vote/:incidentId", authenticateUser, voteIncident)
router.post("/comment/:incidentId", authenticateUser, addComment)
router.get("/comment/:incidentId", authenticateUser, fetchComments)


export default router;