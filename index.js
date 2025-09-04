import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectionDB from "./config/dbConnection.js";
import uploadRoute from './routes/uploadRoute.js';

// Import routes
import userRoute from './routes/userRoute.js';
import productRoute from './routes/productRoute.js';
import adminRoute from './routes/adminRoute.js';
import addRoute from './routes/addRoute.js';
import cartRoute from './routes/cartRoute.js';
import orderRoute from './routes/orderRoute.js';
import prescriptionRoute from './routes/prescriptionRoute.js';

// Import socket handler
import setupChatHandlers from "./socketHandlers/chatHandler.js";

dotenv.config();
const PORT = process.env.PORT || 3000;

// Express app
const app = express();
app.use('/upload', uploadRoute);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use("/chat", express.static("chat"));

// Routes
app.use('/user', userRoute);
app.use('/product', productRoute);
app.use('/admin', adminRoute);
app.use('/banneradd', addRoute);
app.use('/cart', cartRoute);
app.use('/order', orderRoute);
app.use('/prescription', prescriptionRoute);


// HTTP server
const httpServer = createServer(app);

// Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Setup chat handlers
setupChatHandlers(io);

// Connect to database and start server
connectionDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });