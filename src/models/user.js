import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false
    },
    phoneNumber: {
        type: String,
        required: true
    },
    constituency: {
        type: mongoose.Schema.Types.ObjectId, // Fix: Use ObjectId, not the model
        ref: "Constituency",
        required: false
    },
    email: {
        type: String,
        required: false,
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: (email) => {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: "Please enter a valid email address"
        }
    },
    profileImage: {
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    role: {
        type: String,
        required: false,
        default: 'user'
    }
})

export default mongoose.model("User", userSchema);