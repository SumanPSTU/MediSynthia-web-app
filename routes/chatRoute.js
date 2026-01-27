import express from 'express';
import { adminAuthentication } from '../middleware/isAuthentication.js';
import { userAuthentication } from '../middleware/isAuthentication.js';
import Chat from '../models/chatModel.js';
import { User } from '../models/userModel.js';
const router = express.Router();

// Get all unique users who have chatted with admin (receiverId = admin)
router.get('/users', adminAuthentication, async (req, res) => {
  try {
    const adminId = req.admin;
    
    // Get all unique senderIds where receiver is admin (check both ObjectId and string 'admin')
    // This handles both old messages (receiverId: 'admin') and new messages (receiverId: actual admin ID)
    const chats = await Chat.find({
      $or: [
        { receiverId: adminId },
        { receiverId: 'admin' }
      ]
    }).distinct('senderId');
    
    // Also get chats where sender is admin
    const chatsFromAdmin = await Chat.find({ senderId: adminId }).distinct('receiverId');
    
    // Combine and deduplicate, and filter out non-ObjectId values (strings like 'admin', guest IDs, etc)
    const uniqueUserIds = [...new Set([...chats, ...chatsFromAdmin])].filter(id => {
      // Keep only valid MongoDB ObjectIds (24 hex characters)
      return typeof id === 'object' || (typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id));
    });
    
    // Get user details
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select('-password');
    
    // Get last message and unread count for each user
    const usersWithInfo = await Promise.all(users.map(async (user) => {
      const lastChat = await Chat.findOne({
        $or: [
          { senderId: user._id.toString(), receiverId: adminId },
          { senderId: user._id.toString(), receiverId: 'admin' },
          { senderId: adminId, receiverId: user._id.toString() },
          { senderId: 'admin', receiverId: user._id.toString() }
        ]
      }).sort({ timestamp: -1 });
      
      const unreadCount = await Chat.countDocuments({
        senderId: user._id.toString(),
        $or: [
          { receiverId: adminId },
          { receiverId: 'admin' }
        ],
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
    const adminId = req.admin;
    const { userId } = req.params;
    
    // Find messages between user and admin (checking both 'admin' and actual admin ID)
    const messages = await Chat.find({
      $or: [
        { senderId: userId, receiverId: adminId },
        { senderId: userId, receiverId: 'admin' },
        { senderId: adminId, receiverId: userId },
        { senderId: 'admin', receiverId: userId }
      ]
    }).sort({ timestamp: 1 });
    
    // Mark messages as read (both old and new format)
    await Chat.updateMany(
      { 
        senderId: userId,
        $or: [
          { receiverId: adminId },
          { receiverId: 'admin' }
        ],
        read: false 
      },
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
    const senderId = req.admin;
    
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
    const adminId = req.admin;
    
    const unreadCount = await Chat.countDocuments({
      $or: [
        { receiverId: adminId },
        { receiverId: 'admin' }
      ],
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

// User: Get messages with admin
router.get('/messages/admin', userAuthentication, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    // Find messages between user and admin (checking both 'admin' and actual admin ID)
    const messages = await Chat.find({
      $or: [
        { senderId: userId, receiverId: 'admin' },
        { senderId: 'admin', receiverId: userId }
      ]
    }).sort({ timestamp: 1 });
    
    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;

