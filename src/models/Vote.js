import mongoose from "mongoose";

const voteSchema = new mongoose.Schema(
    {
        incident: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Incident",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ['upvote', 'downvote'],
            required: true,
        }
    },
    { timestamps: true }
);

// Ensure that each user can vote only once per incident
voteSchema.index({ incident: 1, user: 1 }, { unique: true });

const Vote = mongoose.model("Vote", voteSchema);

export default Vote;
