import express from "express";
import Chat from "../models/chatModel.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get conversation between two users
router.get("/conversation/:userId1/:userId2", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const { limit = 50, before } = req.query;
    
    let query = {
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 }
      ]
    };
    
    // If before parameter is provided, get messages before this date
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }
    
    const messages = await Chat.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json(messages.reverse());
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all conversations for a user
router.get("/conversations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get distinct conversation partners
    const conversations = await Chat.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      },
      {
        $project: {
          partner: {
            $cond: {
              if: { $eq: ["$senderId", userId] },
              then: "$receiverId",
              else: "$senderId"
            }
          },
          lastMessage: "$$ROOT"
        }
      },
      {
        $group: {
          _id: "$partner",
          lastMessage: { $last: "$lastMessage" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$lastMessage.receiverId", userId] },
                  { $eq: ["$lastMessage.read", false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { "lastMessage.timestamp": -1 }
      }
    ]);
    
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark messages as read
router.put("/read/:userId1/:userId2", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    
    await Chat.updateMany(
      {
        senderId: userId2,
        receiverId: userId1,
        read: { $ne: true }
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    );
    
    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin endpoint to delete old messages
router.delete("/admin/cleanup", async (req, res) => {
  try {
    const { days } = req.body;
    
    if (!days || isNaN(days)) {
      return res.status(400).json({ error: "Please provide a valid number of days" });
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Find messages to delete
    const messagesToDelete = await Chat.find({
      timestamp: { $lt: cutoffDate }
    });
    
    // Delete associated files
    messagesToDelete.forEach(message => {
      if (message.fileUrl) {
        const filePath = path.join(__dirname, '..', 'chat', path.basename(message.fileUrl));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });
    
    // Delete messages from database
    const result = await Chat.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    res.json({ 
      message: `Deleted ${result.deletedCount} messages and their associated files older than ${days} days` 
    });
  } catch (error) {
    console.error("Error deleting old messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;