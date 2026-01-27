import Chat from "../models/chatModel.js";

const setupChatHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    // User joins their personal channel
    socket.on("joinUser", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their personal channel`);
      
      // Also join "admin" channel if user is admin (has _id as numeric or UUID)
      if (userId && userId !== 'admin' && userId !== 'guest' && !userId.startsWith('guest_')) {
        socket.join('admin');
        console.log(`Admin user joined admin channel`);
      }
    });

    // Send direct message to a specific user
    socket.on("sendDirectMessage", async (data) => {
      try {
        console.log("Received sendDirectMessage:", data);
        const { senderId, receiverId, message, senderType } = data;
        
        if (!senderId || !receiverId) {
          socket.emit("error", { message: "Sender and receiver IDs are required" });
          return;
        }

        if (!message) {
          socket.emit("error", { message: "Message content is required" });
          return;
        }

        // Save message to database
        const chatMessage = new Chat({
          senderId,
          receiverId,
          message,
          senderType: senderType || 'user',
          timestamp: new Date()
        });

        await chatMessage.save();
        console.log("Message saved with ID:", chatMessage._id);

        // Emit to the receiver
        io.to(receiverId).emit("receiveDirectMessage", {
          _id: chatMessage._id,
          senderId,
          receiverId,
          message,
          senderType,
          timestamp: chatMessage.timestamp
        });

        // Also emit to admin channel if message is being sent to "admin"
        // This ensures admins receive messages even if they joined with their actual ID
        if (receiverId === 'admin') {
          io.to('admin').emit("receiveDirectMessage", {
            _id: chatMessage._id,
            senderId,
            receiverId,
            message,
            senderType,
            timestamp: chatMessage.timestamp
          });
        }

        // Also send back to sender for confirmation
        socket.emit("messageSent", {
          _id: chatMessage._id,
          senderId,
          receiverId,
          message,
          senderType,
          timestamp: chatMessage.timestamp
        });

        console.log(`Message sent from ${senderId} to ${receiverId}`);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle file messages (for already uploaded files)
    socket.on("sendFileMessage", async (data) => {
      try {
        const { senderId, receiverId, fileUrl, fileName, fileSize, fileType, senderType, message } = data;
        
        if (!senderId || !receiverId || !fileUrl) {
          socket.emit("error", { message: "Sender, receiver and file URL are required" });
          return;
        }

        // Save file message to database
        const chatMessage = new Chat({
          senderId,
          receiverId,
          message: message || '',
          fileUrl,
          fileName,
          fileSize,
          fileType,
          senderType,
          timestamp: new Date()
        });

        await chatMessage.save();

        // Emit to the receiver
        io.to(receiverId).emit("receiveDirectMessage", {
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
        });

        // Also emit to admin channel if message is being sent to "admin"
        if (receiverId === 'admin') {
          io.to('admin').emit("receiveDirectMessage", {
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
          });
        }

        // Also send back to sender for confirmation
        socket.emit("messageSent", {
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
        });

        console.log(`File message sent from ${senderId} to ${receiverId}`);
      } catch (error) {
        console.error("Error sending file message:", error);
        socket.emit("error", { message: "Failed to send file message" });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

export default setupChatHandlers;