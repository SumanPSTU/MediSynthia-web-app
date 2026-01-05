import { Comment } from "../models/commentModel.js"; 


export const createComment = async (req, res) => {
  try {
    const { productId, content, rating } = req.body;
    const userId = req.user._id;

    if (!productId || !content || !rating) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // check rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // prevent duplicate comment (if index not enough)
    const alreadyCommented = await Comment.findOne({ userId, productId });

    if (alreadyCommented) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    const comment = await Comment.create({
      userId,
      productId,
      content,
      rating,
    });

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create comment",
      error: error.message,
    });
  }
};




export const getCommentsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const comments = await Comment.find({
      productId,
      isDeleted: false,
      isApproved: true,
    })
      .populate("userId", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
      error: error.message,
    });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, rating } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findOne({ _id: id, userId });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or unauthorized",
      });
    }

    if (content) comment.content = content;
    if (rating) comment.rating = rating;

    await comment.save();

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update comment",
      error: error.message,
    });
  }
};


export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findOne({ _id: id, userId });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or unauthorized",
      });
    }

    comment.isDeleted = true;
    await comment.save();

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: error.message,
    });
  }
};
