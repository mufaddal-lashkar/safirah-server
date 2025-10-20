import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['harassment', 'stalking', 'unsafe_area', 'emergency', 'suspicious', 'other'],
            required: true,
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        image: {
            type: String,
            default: ""
        },
        area: {
            type: String,
            trim: true,
        },
        location: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            postcode: { type: Number, required: true },
            country: { type: String, required: true },
        },
        isAnonymous: {
            type: Boolean,
            default: false,
        },
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: function () {
                return !this.isAnonymous; // reporter is required only if not anonymous
            },
        },
    },
    { timestamps: true }
);

const Incident = mongoose.model("Incident", incidentSchema);

export default Incident;
