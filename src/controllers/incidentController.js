import { User, Incident, Vote, Comment } from "../models/index.js"
import cloudinary from "../utils/cloudinary.js";
import mongoose from "mongoose";

export const reportIncident = async (req, res) => {
    try {
        const { title, description, type, severity, area, city, state, postcode, country, latitude, longitude, isAnonymous = false, hasImage = false } = req.body;

        // Validate required fields
        if (!title || !description || !type || !severity || !city || !state || !postcode || !country || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: "Required fields (title, description, type, severity, city, state, postcode, country, latitude, longitude) are missing.",
            });
        }

        if (hasImage && !req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded even though hasImage is true.", });
        }

        // Validate allowed types and severities
        const validTypes = ['harassment', 'stalking', 'unsafe_area', 'emergency', 'suspicious', 'other'];
        const validSeverities = ['low', 'medium', 'high', 'critical'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid incident type. Must be one of: ${validTypes.join(", ")}`,
            });
        }
        if (!validSeverities.includes(severity)) {
            return res.status(400).json({
                success: false,
                message: `Invalid severity level. Must be one of: ${validSeverities.join(", ")}`,
            });
        }

        // If not anonymous, reporter must exist and be valid
        if (!isAnonymous) {
            if (!req.user._id) {
                return res.status(400).json({
                    success: false,
                    message: "Reporter ID is required for non-anonymous reports.",
                });
            }

            // Optional: verify that the reporter exists
            const userExists = await User.findById(req.user._id);
            if (!userExists) {
                return res.status(404).json({
                    success: false,
                    message: "Reporter not found in database.",
                });
            }
        }

        console.log("File found :: ", req.file)
        let uploadResult = { secure_url: "" };
        if (req.file) {
            const uploadToCloudinary = () =>
                new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: "incidents" },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    stream.end(req.file.buffer);
                });

            uploadResult = await uploadToCloudinary();
        }


        // Create incident
        const newIncident = new Incident({
            title: title.trim(),
            description: description.trim(),
            type,
            severity,
            image: uploadResult.secure_url || "",
            area: area || "",
            location: {
                latitude: Number(latitude),
                longitude: Number(longitude),
                city: city.trim(),
                state: state.trim(),
                postcode: Number(postcode),
                country: country.trim(),
            },
            isAnonymous,
            reporter: isAnonymous == true ? null : req.user._id,
        });

        await newIncident.save();

        // Respond success
        return res.status(201).json({
            success: true,
            message: "Incident reported successfully.",
            incident: newIncident,
        });

    } catch (error) {
        console.error("Error reporting incident:", error);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while reporting the incident.",
            error: error,
        });
    }
};

export const fetchIncidents = async (req, res) => {
    try {
        const { type = "all", severity = "all", city, page = 1 } = req.query;
        const userId = req.user._id;

        if (!city) {
            return res.status(400).json({ success: false, message: "City is required in query params." });
        }

        const limit = 30;
        const skip = (page - 1) * limit;

        // Base match query
        const matchQuery = { "location.city": city };
        if (type !== "all") matchQuery.type = type;
        if (severity !== "all") matchQuery.severity = severity;

        const incidents = await Incident.aggregate([
            // Filter incidents
            { $match: matchQuery },

            // Sort and paginate
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },

            // Lookup reporter details
            {
                $lookup: {
                    from: "users",
                    localField: "reporter",
                    foreignField: "_id",
                    as: "reporter",
                    pipeline: [
                        { $project: { _id: 1, fullName: 1, profilePic: 1, email: 1 } }
                    ]
                }
            },
            { $unwind: "$reporter" },

            // Lookup votes for each incident
            {
                $lookup: {
                    from: "votes",
                    localField: "_id",
                    foreignField: "incident",
                    as: "votes"
                }
            },

            // Lookup comments count for each incident
            {
                $lookup: {
                    from: "comments",
                    localField: "_id",
                    foreignField: "incident",
                    as: "comments"
                }
            },

            // Add computed fields
            {
                $addFields: {
                    commentsCount: { $size: "$comments" },
                    upvotesCount: {
                        $size: {
                            $filter: {
                                input: "$votes",
                                as: "v",
                                cond: { $eq: ["$$v.type", "upvote"] }
                            }
                        }
                    },
                    downvotesCount: {
                        $size: {
                            $filter: {
                                input: "$votes",
                                as: "v",
                                cond: { $eq: ["$$v.type", "downvote"] }
                            }
                        }
                    },
                    isUpvoted: {
                        $in: [mongoose.Types.ObjectId.createFromHexString(userId || "000000000000000000000000"), {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$votes",
                                        as: "v",
                                        cond: { $eq: ["$$v.type", "upvote"] }
                                    }
                                },
                                as: "uv",
                                in: "$$uv.user"
                            }
                        }]
                    },
                    isDownvoted: {
                        $in: [mongoose.Types.ObjectId.createFromHexString(userId || "000000000000000000000000"), {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$votes",
                                        as: "v",
                                        cond: { $eq: ["$$v.type", "downvote"] }
                                    }
                                },
                                as: "dv",
                                in: "$$dv.user"
                            }
                        }]
                    },
                }
            },

            // Remove heavy arrays
            { $project: { votes: 0, comments: 0 } }
        ]);

        // Count total documents for pagination
        const totalIncidents = await Incident.countDocuments(matchQuery);
        const totalPages = Math.ceil(totalIncidents / limit);

        res.status(200).json({
            success: true,
            currentPage: Number(page),
            totalPages,
            totalIncidents,
            incidents,
        });
    } catch (error) {
        console.error("Error fetching incidents:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching incidents.",
        });
    }
};

export const voteIncident = async (req, res) => {
    try {
        const { incidentId } = req.params;
        const { type } = req.body;
        const userId = req.user._id;

        if (!["upvote", "downvote"].includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid vote type." });
        }

        // Check if the incident exists
        const incidentExists = await Incident.findById(incidentId);
        if (!incidentExists) {
            return res.status(404).json({ success: false, message: "Incident not found." });
        }

        // Check existing vote
        const existingVote = await Vote.findOne({ incident: incidentId, user: userId });

        if (!existingVote) {
            // No vote → create new
            const newVote = new Vote({ incident: incidentId, user: userId, type });
            await newVote.save();
            return res.status(201).json({ success: true, message: `You ${type}d this incident.` });
        }

        if (existingVote.type === type) {
            // Same vote → remove (toggle off)
            await Vote.deleteOne({ _id: existingVote._id });
            return res.status(200).json({ success: true, message: `${type} removed.` });
        }

        // Different vote → update it
        existingVote.type = type;
        await existingVote.save();
        return res.status(200).json({ success: true, message: `Changed to ${type}.` });

    } catch (error) {
        console.error("Error handling vote:", error);
        res.status(500).json({
            success: false,
            message: "Server error while processing vote.",
        });
    }
};

export const deleteIncident = async (req, res) => {
    try {

    } catch (error) {

    }
}

export const addComment = async (req, res) => {
    try {
        const { incidentId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text || text.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Comment text is required.",
            });
        }

        // check if incident exists
        const incident = await Incident.findById(incidentId);
        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found.",
            });
        }

        // create comment
        const comment = await Comment.create({
            incident: incidentId,
            user: userId,
            text: text.trim(),
        });

        // populate user details for response
        const populatedComment = await comment.populate("user", "fullName profilePic");

        res.status(201).json({
            success: true,
            message: "Comment added successfully.",
            comment: populatedComment,
        });
    } catch (error) {
        console.error("Error adding comment :: ", error);
        res.status(500).json({
            success: false,
            message: "Server error while adding comment.",
            error: error.message,
        });
    }
};

export const fetchComments = async (req, res) => {
    try {
        const { incidentId } = req.params;
        if (!incidentId) {
            return res.status(400).json({ success: false, message: "Incident ID is required."});
        }

        const comments = await Comment.find({ incident: incidentId })
            .populate("user", "name profilePic")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: comments.length,
            comments,
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch comments.",
        });
    }
};