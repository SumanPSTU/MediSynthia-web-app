import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  productId: { type: String }, // optional
  productName: { type: String, required: true },        
  productGeneric: {type:String},                    
  productSupplierName: { type: String },                
  strength: { type: String },
  dose: { type: String },

  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category",required:false },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory",required:false },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier",required:false },

  productImgUrl: { type: String, required: true },     
  productDescription: { type: String },
  sideEffect: { type: String },

  isAvailable: { type: Boolean, default: true },
  productPrice: { type: Number, required: true },      

  // discount percentage applied specifically to this product (0-100)
  discountPercentage: { type: Number, default: 0 }
}, { timestamps: true });

export const Products = mongoose.model("Products", productSchema);
