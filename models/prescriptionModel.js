import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    notes: { type: String },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    prescriptionUrl:{type:String},
    dateIssued: { type: Date, default: Date.now }
});

export const Prescription = mongoose.model("Prescription", prescriptionSchema);
