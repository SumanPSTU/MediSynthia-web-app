import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    productId: { type: String, required: false },
    productName: { type: String, required: true },
    productGeniric: { type: String },
    productSuplier:{type:String},
    strength: { type: String },
    dose: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" },
    supplier:{type:mongoose.Schema.Types.ObjectId, ref:"Supplier"},
    productImgUrl: { type: String, required: false },
    productDescription: { type: String, required: false },
    sideEffect: { type: String },
    isAvailable: { type: Boolean,default: true },
    productPrice: { type: Number, required: true },
    // discount percentage applied specifically to this product (0-100)
    discountPercentage: { type: Number, default: 0 }
});
export const Products = mongoose.model("Products", productSchema);