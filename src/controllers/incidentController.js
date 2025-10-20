import { User, Incident } from "../models/index.js"
import cloudinary from "../utils/cloudinary.js";

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

        if (!city) {
            return res.status(400).json({ success: false, message: "City is required in query params." });
        }

        // Base query
        const query = { "location.city": city };

        if (type !== "all") {
            query.type = type;
        }
        if (severity !== "all") {
            query.severity = severity;
        }

        const limit = 30;
        const skip = (page - 1) * limit;

        // Fetch incidents with pagination
        const incidents = await Incident.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("reporter", "_id fullName profilePic email")

        const totalIncidents = await Incident.countDocuments(query);
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



export const deleteIncident = async (req, res) => {
    try {

    } catch (error) {

    }
}