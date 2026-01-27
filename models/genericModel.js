import mongoose from "mongoose";

const genericSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
}, { timestamps: true });

genericSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const Generic = mongoose.model("Generic", genericSchema);

