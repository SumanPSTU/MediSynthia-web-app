import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  description: String,
  imageUrl: String,
  // discount percentage applied to all products in this subcategory (0-100)
  discountPercentage: { type: Number, default: 0 },
}, { timestamps: true });


export const SubCategory = mongoose.model("SubCategory", subCategorySchema);
