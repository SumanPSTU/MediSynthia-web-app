import mongoose from "mongoose";
const productSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productGeniric: { type: String, required: true },
    strength: { type: String, required: true },
    dose: { type: String, required: true },
    catagory: { type: String },
    productImgUrl: { type: String, required: false },
    productDescription: { type: String, required: true },
    sideEffect: { type: String },
    isAvailable: { type: Boolean,default: true },
    productPrice: { type: Number, required: true }
});
export const Products = mongoose.model("Products", productSchema);