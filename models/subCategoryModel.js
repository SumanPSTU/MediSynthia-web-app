import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  description: String,
  imageUrl: String,
}, { timestamps: true });


export const SubCategory = mongoose.model("SubCategory", subCategorySchema);
