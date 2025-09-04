import express from "express";
import upload from "../middleware/upload.js";
import Chat from "../models/chatModel.js";

const router = express.Router();

// Handle file uploads
router.post("/", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { senderId, receiverId, senderType, message } = req.body;
    
    if (!senderId || !receiverId || !senderType) {
      // Clean up the uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "Sender, receiver IDs and sender type are required" });
    }

    // Save file information to database
    const chatMessage = new Chat({
      senderId,
      receiverId,
      message: message || '', // Optional text message with file
      fileUrl: `/chat/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      senderType,
      timestamp: new Date()
    });

    await chatMessage.save();

    res.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        _id: chatMessage._id,
        senderId,
        receiverId,
        message: chatMessage.message,
        fileUrl: chatMessage.fileUrl,
        fileName: chatMessage.fileName,
        fileSize: chatMessage.fileSize,
        fileType: chatMessage.fileType,
        senderType,
        timestamp: chatMessage.timestamp
      }
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    
    // Clean up the uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});

// Get file by filename
router.get("/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../chat', filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;