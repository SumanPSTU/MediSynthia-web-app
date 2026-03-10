import express from 'express';
import { adminAuthentication } from '../middleware/isAuthentication.js';
import { userAuthentication } from '../middleware/isAuthentication.js';
import Chat from '../models/chatModel.js';
import { Admin } from '../models/adminModel.js';
import { User } from '../models/userModel.js';
const router = express.Router();

// Debug route to get all messages
router.get('/debug/messages', adminAuthentication, async (req, res) => {
  try {
    const messages = await Chat.find({}).limit(10).sort({ timestamp: -1 });
    const totalCount = await Chat.countDocuments();

    res.json({
      success: true,
      totalMessages: totalCount,
      sampleMessages: messages.map(m => ({
        id: m._id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        message: m.message?.substring(0, 50),
        timestamp: m.timestamp
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all unique users who have chatted with admin (receiverId = admin)
router.get('/users', adminAuthentication, async (req, res) => {
  try {
    const adminId = req.admin;

    // First, let's check total messages in database
    const totalMessages = await Chat.countDocuments();

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
    const allIds = [...new Set([...chats, ...chatsFromAdmin])];
    const uniqueUserIds = allIds.filter(id => {
      // Keep only valid MongoDB ObjectIds (24 hex characters)
      const idStr = typeof id === 'object' ? id.toString() : id;
      return typeof idStr === 'string' && /^[0-9a-f]{24}$/i.test(idStr);
    });

    
    // Get user details - only query if we have valid IDs
    const users = await User.find({ _id: { $in: uniqueUserIds } });
    
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

// User: Get messages with admin (MUST be before /messages/:userId to prevent route collision)
router.get('/messages/admin', userAuthentication, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const userId = req.user._id.toString();
    
    let adminIdStrings = [];
    try {
      const adminIds = await Admin.find({}).select('_id');
      adminIdStrings = adminIds.map((a) => a._id.toString());
    } catch (e) {
      adminIdStrings = [];
    }

    // Find messages between user and admin (checking both legacy 'admin' and actual admin IDs)
    const adminIdFilter = adminIdStrings.length > 0
      ? [
          { senderId: userId, receiverId: { $in: adminIdStrings } },
          { senderId: { $in: adminIdStrings }, receiverId: userId }
        ]
      : [];

    const messages = await Chat.find({
      $or: [
        { senderId: userId, receiverId: 'admin' },
        { senderId: 'admin', receiverId: userId },
        ...adminIdFilter
      ]
    }).sort({ timestamp: 1 });
    
    // Mark messages from admin as read only if markAsRead query param is true
    const shouldMarkAsRead = req.query.markAsRead === 'true';
    if (shouldMarkAsRead) {
      await Chat.updateMany(
        {
          $or: [
            { senderId: 'admin', receiverId: userId },
            { senderId: { $in: adminIdStrings }, receiverId: userId }
          ],
          read: false
        },
        { $set: { read: true, readAt: new Date() } }
      );
    }
    
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
    const updateResult = await Chat.updateMany(
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

export default router;

