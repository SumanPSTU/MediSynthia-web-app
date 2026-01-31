import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  productId: { type: String }, // optional
  productName: { type: String, required: true },        
  productGeniric: {type:String},                    
  productSupplierName: { type: String },                
  strength: { type: String },
  dose: { type: String },

  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },

  productImgUrl: { type: String, required: true },     
  productDescription: { type: String },
  sideEffect: { type: String },

  isAvailable: { type: Boolean, default: true },
  productPrice: { type: Number, required: true },      

  // discount percentage applied specifically to this product (0-100)
  discountPercentage: { type: Number, default: 0 }
}, { timestamps: true });

export const Products = mongoose.model("Products", productSchema);
