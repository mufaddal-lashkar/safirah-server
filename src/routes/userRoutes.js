import express from "express"
import { registerUser, loginUser, getCurrentUser, changeProfilePic, deleteUserProfilePic } from "../controllers/userController.js"
import { authenticateUser } from "../utils/verifyToken.js";
import upload from "../utils/multer.js"

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/get-current-user",authenticateUser, getCurrentUser);
router.post("/change-profile-pic",authenticateUser, upload.single('file'), changeProfilePic)
router.post("/remove-profile-pic",authenticateUser, deleteUserProfilePic)

export default router;