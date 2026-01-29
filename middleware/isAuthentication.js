import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../models/userModel.js';
import { Admin } from '../models/adminModel.js';
import { logoutUser } from '../controllers/userController.js';
import { logoutAdmin } from '../controllers/adminController.js';

dotenv.config();
export const userAuthentication = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing or invalid",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Access token has expired, use refreshToken to generate again",
        });
      }
      return res.status(400).json({
        success: false,
        message: "Access token is invalid",
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if(user.isBlocked){
      await logoutUser(req,res);
    }
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const adminAuthentication = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing or invalid",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Access token has expired, use refreshToken to generate again",
        });
      }
      return res.status(400).json({
        success: false,
        message: "Access token is invalid",
      });
    }

    
    let admin = await Admin.findById(decoded.id);
    
    // If not found in Admin collection, check User collection (admin might use user account)
    if (!admin) {
      admin = await User.findById(decoded.id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }
    }
    if(admin.isBlocked){
      await logoutAdmin(req,res);
    }

    req.admin = admin._id;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
