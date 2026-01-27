import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: [100, "Name cannot exceed 100 characters"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [200, "Subject cannot exceed 200 characters"],
    default: "",
  },
  message: {
    type: String,
    required: [true, "Message is required"],
    trim: true,
    maxlength: [2000, "Message cannot exceed 2000 characters"],
  },
  status: {
    type: String,
    enum: ["pending", "read", "replied", "closed"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for better query performance
contactSchema.index({ createdAt: -1 });
contactSchema.index({ status: 1 });
contactSchema.index({ userId: 1 });

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;

