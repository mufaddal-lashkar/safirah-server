// controllers/userController.js
import User from "../models/User.js"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import cloudinary from "../utils/cloudinary.js"

export const registerUser = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = await User.create({
            fullName,
            email,
            password: hashedPassword,
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully, please login now.",
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while register user" });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // Check if user exists
        const user = await User.findOne({ email: email }).select("+password")
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found in db." });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user?.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        // Generate JWT token
        const token = jwt.sign(
            { _id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "30d" } // token valid for 30 days
        );

        // Return user data without password
        const userResponse = {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            profilePic: user.profilePic,
            createdAt: user.createdAt,
        };

        console.log("user logged in successfully :: ", userResponse)
        console.log("user logged in TOKEN :: ", token)

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: userResponse,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while login user" });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        // find user in db
        const user = await User.findById(req.user._id).select("-password -__v")
        if (!user) {
            return res.status(400).json({ success: false, message: "Counldn't find current user in db." });
        }

        // return user
        res.json({
            success: true,
            message: "Current user fetched successfully.",
            user: user,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while getting current user" });
    }
}

export const changeProfilePic = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ success: false, message: "No file uploaded" });

        const user = await User.findById(req.user._id);
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
 
        // If user already has a profile pic — delete it first
        if (user.profilePic) {
            const imageUrl = user.profilePic;
            const parts = imageUrl.split("/upload/")[1];
            if (parts) {
                const publicIdWithVersion = parts.split(".")[0];
                const publicId = publicIdWithVersion.split("/").slice(1).join("/");
                const delRes = await cloudinary.uploader.destroy(publicId);
                console.log("Old image deleted:", delRes);
            }
            user.profilePic = "";
        }

        // Upload new image to Cloudinary
        const uploadToCloudinary = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "users" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });
        };

        const uploadResult = await uploadToCloudinary();

        // Save new image URL to DB
        user.profilePic = uploadResult.secure_url;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile picture updated successfully",
            user,
        });
    } catch (error) {
        console.error("Error in changeProfilePic:", error);
        res.status(500).json({
            success: false,
            message: "Server error while changing profile picture",
            details: error,
        });
    }
};

export const deleteUserProfilePic = async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ success: false, message: "Image URL is required" });
        }

        // Extract public_id from Cloudinary URL
        const parts = imageUrl.split("/upload/")[1]; // e.g. "v1728755451/folder/image.jpg"
        if (!parts) {
            return res.status(400).json({ success: false, message: "Invalid Cloudinary image URL" });
        }

        const publicIdWithVersion = parts.split(".")[0]; // remove file extension
        const publicId = publicIdWithVersion.split("/").slice(1).join("/"); // remove version (v1728755451)

        // Delete image from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === "not found") {
            return res.status(404).json({ success: false, message: "Image not found on Cloudinary" });
        }

        // delete url from db
        const user = await User.findById(req.user._id).select("-password -__v")
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found." });
        }
        user.profilePic = ""
        await user.save()

        console.log("Image deleted successfully:", result);
        res.status(200).json({
            success: true,
            message: "Image deleted successfully",
            user,
            result
        });
    } catch (err) {
        console.error("Error deleting image:", err);
        res.status(500).json({ success: false, message: "Failed to delete image", details: err.message });
    }
};