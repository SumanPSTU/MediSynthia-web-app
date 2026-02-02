import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
      required: true
    },
    content: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 500
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    adminReply: {
      content: { type: String, minlength: 1, maxlength: 500 },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
      repliedAt: { type: Date }
    },
    isApproved: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

commentSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Comment = mongoose.model('Comment', commentSchema);
