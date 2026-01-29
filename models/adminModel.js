import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone:{type:String,required:true},
    isVerified: { type: Boolean, default: false },
    isLoggedIn: { type: Boolean, default: false },
    isBlocked:{type:Boolean,default:false},
    token: { type: String, default: null },
    otp: { type: String, default: null },
    otpExpired: { type: Date, default: null },
    phone:{type:String,required:true},
}, { timestamps: true });

export const Admin = mongoose.model("Admin", adminSchema);