import mongoose from "mongoose";

const bannerAddSchema = new mongoose.Schema({
    addId: { type: String, required: true },
    addDescription: { type: String, required: false },
    addImgUrl: { type: String, required: true },
    activeStatus: { type: Boolean, default: true },
    addNumber: { type: String, required: true }
}, { timestamps: true });
export const BannerAdd = mongoose.model("BannerAdd", bannerAddSchema);