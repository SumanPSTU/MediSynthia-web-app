import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import connectionDB from "./config/dbConnection.js";
import uploadRoute from './routes/uploadRoute.js';
import cors from "cors";

// Import routes
import userRoute from './routes/userRoute.js';
import productRoute from './routes/productRoute.js';
import adminRoute from './routes/adminRoute.js';
import addRoute from './routes/addRoute.js';
import cartRoute from './routes/cartRoute.js';
import orderRoute from './routes/orderRoute.js';
import prescriptionRoute from './routes/prescriptionRoute.js';
import category from './routes/categoryRoute.js';
import subcategory from './routes/subCategoryRoute.js';
import chatRoute from './routes/chatRoute.js';
import contactRoute from './routes/contactRoute.js';
import supplierRoute from './routes/supplierRoute.js';
import genericRoute from './routes/genericRoute.js';

// Import socket handler
import setupChatHandlers from "./socketHandlers/chatHandler.js";

dotenv.config();
const PORT = process.env.PORT || 3000;

// Parse CORS origins from environment variables
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(url => url.trim())
  : [];

// Express app
const app = express();
app.use('/upload', uploadRoute);

// CORS Configuration with all HTTP methods - Allow all origins for messenger
const corsOptions = {
  origin: (origin, callback) => {
    // Allow all origins for messenger/chat functionality
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use("/chat", express.static("chat"));

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/user', userRoute);
app.use('/product', productRoute);
app.use('/admin', adminRoute);
app.use('/banneradd', addRoute);
app.use('/cart', cartRoute);
app.use('/order', orderRoute);
app.use('/prescription', prescriptionRoute);
app.use('/category',category);
app.use('/subcategory',subcategory);
app.use('/supplier', supplierRoute);
app.use('/generic', genericRoute);
app.use('/api/chat',chatRoute);
app.use('/', contactRoute);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);


  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// HTTP server
const httpServer = createServer(app);
// Socket.IO server - allow all origins for messenger
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins for messenger/chat functionality
      callback(null, true);
    },
  },
});

// Setup chat handlers
setupChatHandlers(io);

// Connect to database and start server
connectionDB()
  .then((conn) => {
    if (conn || mongoose.connection.readyState === 1) {
      httpServer.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
      });
    }
    
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    
    process.exit(1);
  });