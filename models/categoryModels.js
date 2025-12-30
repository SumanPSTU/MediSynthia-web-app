import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    imageUrl: { type: String },
    // discount percentage applied to all products in this category (0-100)
    discountPercentage: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);
