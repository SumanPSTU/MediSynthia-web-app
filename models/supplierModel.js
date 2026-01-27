import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    imageUrl: { type: String },
},
{ timestamps: true }
);

supplierSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const Supplier = mongoose.model("Supplier", supplierSchema);