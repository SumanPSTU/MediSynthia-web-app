import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true
  },
  receiverId: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: false
  },
  fileUrl: {
    type: String,
    required: false
  },
  fileName: {
    type: String,
    required: false
  },
  fileSize: {
    type: Number,
    required: false
  },
  fileType: {
    type: String,
    required: false
  },
  senderType: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster querying
chatSchema.index({ senderId: 1, receiverId: 1 });
chatSchema.index({ timestamp: 1 });

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;