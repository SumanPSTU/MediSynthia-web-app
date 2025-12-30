import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productGeniric: { type: String, required: true },
    productSuplier:{type:String},
    strength: { type: String, required: true },
    dose: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" },
    productImgUrl: { type: String, required: false },
    productDescription: { type: String, required: true },
    sideEffect: { type: String },
    isAvailable: { type: Boolean,default: true },
    productPrice: { type: Number, required: true },
    // discount percentage applied specifically to this product (0-100)
    discountPercentage: { type: Number, default: 0 }
});
export const Products = mongoose.model("Products", productSchema);