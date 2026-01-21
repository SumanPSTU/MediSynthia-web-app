import express from 'express';
import { adminAuthentication } from '../middleware/isAuthentication.js';
import Chat from '../models/chatModel.js';
import User from '../models/userModel.js';
const router = express.Router();

// Get all unique users who have chatted with admin (receiverId = admin)
router.get('/users', adminAuthentication, async (req, res) => {
  try {
    const adminId = req.userId;
    
    // Get all unique senderIds where receiver is admin
    const chats = await Chat.find({ receiverId: adminId }).distinct('senderId');
    
    // Also get chats where sender is admin
    const chatsFromAdmin = await Chat.find({ senderId: adminId }).distinct('receiverId');
    
    // Combine and deduplicate
    const uniqueUserIds = [...new Set([...chats, ...chatsFromAdmin])];
    
    // Get user details
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select('-password');
    
    // Get last message and unread count for each user
    const usersWithInfo = await Promise.all(users.map(async (user) => {
      const lastChat = await Chat.findOne({
        $or: [
          { senderId: user._id.toString(), receiverId: adminId },
          { senderId: adminId, receiverId: user._id.toString() }
        ]
      }).sort({ timestamp: -1 });
      
      const unreadCount = await Chat.countDocuments({
        senderId: user._id.toString(),
        receiverId: adminId,
        read: false
      });
      
      return {
        ...user.toObject(),
        lastMessage: lastChat?.message || lastChat?.fileName || 'No messages',
        lastMessageTime: lastChat?.timestamp,
        unreadCount
      };
    }));
    
    // Sort by last message time
    usersWithInfo.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    
    res.status(200).json({
      success: true,
      users: usersWithInfo
    });
  } catch (error) {
    console.error('Error fetching chat users:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all messages between admin and a specific user
router.get('/messages/:userId', adminAuthentication, async (req, res) => {
  try {
    const adminId = req.userId;
    const { userId } = req.params;
    
    const messages = await Chat.find({
      $or: [
        { senderId: userId, receiverId: adminId },
        { senderId: adminId, receiverId: userId }
      ]
    }).sort({ timestamp: 1 });
    
    // Mark messages as read
    await Chat.updateMany(
      { senderId: userId, receiverId: adminId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    
    res.status(200).json({
      success: true,
      messages,
      user: await User.findById(userId).select('-password')
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send a message (REST API fallback)
router.post('/send', adminAuthentication, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.userId;
    
    if (!receiverId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and message are required'
      });
    }
    
    const chatMessage = new Chat({
      senderId,
      receiverId,
      message,
      senderType: 'admin',
      timestamp: new Date()
    });
    
    await chatMessage.save();
    
    res.status(201).json({
      success: true,
      message: chatMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get unread message count
router.get('/unread-count', adminAuthentication, async (req, res) => {
  try {
    const adminId = req.userId;
    
    const unreadCount = await Chat.countDocuments({
      receiverId: adminId,
      read: false
    });
    
    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;

