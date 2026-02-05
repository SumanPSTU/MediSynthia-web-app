import { sendOtpMailAdmin } from '../email/sendOtpMailAdmin.js';
import { Admin } from '../models/adminModel.js';
import { Session } from '../models/sessionModel.js';
import { User } from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mailVerification from '../email/mailVerification.js';
import { sendOtpMail } from '../email/sendOtpMail.js';
import { validatePasswordStrength } from '../utils/passwordUtils.js';
import { sanitizeEmail, sanitizeUsername, sanitizePhone, isValidEmail, isValidUsername, isValidPhone } from '../utils/inputSanitization.js';
import { blacklistToken } from '../utils/tokenBlacklist.js';
import dotenv from 'dotenv'
dotenv.config();

// Register Admin
export const registerAdmin = async (req, res) => {
  try {
    let { username, email, password, phone } = req.body;

    if (!username || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }

    // Sanitize inputs
    email = sanitizeEmail(email);
    username = sanitizeUsername(username);
    phone = sanitizePhone(phone);

    // Validate inputs
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-30 characters"
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format"
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Password does not meet security requirements",
        errors: passwordValidation.errors
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin && existingAdmin.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      username,
      email,
      password: hashedPassword,
      phone
    });

    const token = jwt.sign({ id: admin._id }, process.env.SECRET_KEY, { expiresIn: "10m" });
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminRUL = process.env.ADMIN_URL;
    mailVerification(token, superAdminEmail, admin.username, adminRUL);
    admin.token = token;
    await admin.save();

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully. Please verify your email",
      superAdminEmail
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin Sign Up verification
export const verification = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing or invalid"
      });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(400).json({
          success: false,
          message: "The registration token has expired"
        });
      }
      return res.status(400).json({
        success: false,
        message: "Token verification failed"
      });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }
    if (admin.isVerified) {
      return res.status(200).json({
        success: false,
        message: "Admin already verified!"
      })
    }
    admin.token = null;
    admin.isVerified = true;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const resendMailForVerification = async (req, res) => {
  try {
    const email = req.params.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (admin.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Admin already verified"
      });
    }

    const token = jwt.sign(
      { id: admin._id },
      process.env.SECRET_KEY,
      { expiresIn: "10m" }
    );

    admin.token = token;
    await admin.save();
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminURL = process.env.ADMIN_URL;
    await mailVerification(token, superAdminEmail, admin.username, adminURL);
    return res.status(200).json({
      success: true,
      message: "Verification email resent to Super Admin"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// resend admin login otp
export const resendOtp = async (req, res) => {
  try {
    const email = req.params.email;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }
    if (!admin.isVerified) {
      return res.status(403).json({
        success: false,
        message: "You are not a verified admin"
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpired = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    admin.otp = otp;
    admin.otpExpired = otpExpired;
    await admin.save();
    await sendOtpMailAdmin(email, otp, admin.username);
    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}


// Admin Login (generates OTP)
export const adminLoggedIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }


    if (!admin.isVerified) {
      return res.status(403).json({
        success: false,
        message: "You are not a verified admin"
      });
    }

    if (admin.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is blocked!"
      })
    }

    const matchPass = await bcrypt.compare(password, admin.password);
    if (!matchPass) {
      return res.status(403).json({
        success: false,
        message: "Incorrect password"
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpired = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    admin.otp = otp;
    admin.otpExpired = otpExpired;
    await admin.save();

    await sendOtpMailAdmin(email, otp, admin.username);

    return res.status(200).json({
      success: true,
      message: "An OTP has been sent to your email"
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error, please try again later"
    });
  }
};


// OTP Verification and Login
export const adminOTPVerify = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.params.email;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (!admin.isVerified) {
      return res.status(403).json({
        success: false,
        message: "You are not a verified admin"
      });
    }

    if (!admin.otp || admin.otpExpired < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired or not generated"
      });
    }

    if (admin.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Incorrect OTP"
      });
    }

    // Clear OTP
    admin.otp = null;
    admin.otpExpired = null;

    // Remove old sessions
    await Session.deleteMany({ userId: admin._id });

    // Create new session
    await Session.create({ userId: admin._id });

    const accessToken = jwt.sign({ id: admin._id }, process.env.SECRET_KEY, { expiresIn: "10m" });
    const refreshToken = jwt.sign({ id: admin._id }, process.env.REFRESH_SECRET_KEY || process.env.SECRET_KEY, { expiresIn: "120d" });

    admin.isLoggedIn = true;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. Admin logged in.",
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, please try later"
    });
  }
};


// Logout Admin
export const logoutAdmin = async (req, res) => {
  try {
    const userId = req.admin;
    const token = req.headers.authorization?.split(" ")[1];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // Blacklist the access token
    if (token) {
      await blacklistToken(token, 'access', null, userId);
    }

    await Session.deleteMany({ userId });

    const admin = await Admin.findById(userId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    admin.isLoggedIn = false;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// Forget Password (Send OTP) 
export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otp = otp;
    admin.otpExpired = Date.now() + 3 * 60 * 1000; // 10 minutes
    await admin.save();

    await sendOtpMail(email, otp, admin.username);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully, please check your email"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Verify OTP for Password Reset
export const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.params.email;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required"
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (!admin.otp || !admin.otpExpired) {
      return res.status(400).json({
        success: false,
        message: "OTP not generated or already verified"
      });
    }

    if (admin.otpExpired < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP"
      });
    }

    if (admin.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    admin.otp = null;
    admin.otpExpired = null;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  try {
    const email = req.params.email;
    const { password, confirmPassword } = req.body;

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found"
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password does not match"
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Password does not meet security requirements",
        errors: passwordValidation.errors
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    const hashPass = await bcrypt.hash(password, 10);
    admin.password = hashPass;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//get all user
export const getAllUser = async (req, res) => {
  try {
    // Get page & limit from query, default: page=1, limit=10
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    // Fetch users with pagination
    const users = await User.find()
      .select("-password")
      .skip(skip)
      .limit(limit);

    // Get total count for pagination metadata
    const totalUsers = await User.countDocuments();

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//search user
export const searchUser = async (req, res) => {
  try {
    const search = req.query.search?.trim();

    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Search key is required"
      });
    }

    const user = await User.find({
      $or: [
        { username: { $regex: `^${search}`, $options: "i" } },
        { email: { $regex: `^${search}`, $options: "i" } },
        { phone: { $regex: `^${search}`, $options: "i" } },
      ]
    }).limit(20);

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found"
      });
    }

    res.status(200).json({
      success: true,
      results: user,
      message: "User(s) found"
    });

  } catch (error) {
    console.error("Error searching user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

// Block user
export const blockUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: true },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "User blocked successfully",
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Unblock user
export const unblockUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: false },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ================= ADMIN MANAGEMENT =================

// Get all admins with pagination
export const getAllAdmins = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const admins = await Admin.find()
      .select("-password -otp -otpExpired -token")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalAdmins = await Admin.countDocuments();

    return res.status(200).json({
      success: true,
      data: admins,
      pagination: {
        total: totalAdmins,
        page,
        limit,
        totalPages: Math.ceil(totalAdmins / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Search admins
export const searchAdmin = async (req, res) => {
  try {
    const search = req.query.search?.trim();

    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Search key is required"
      });
    }

    const admins = await Admin.find({
      $or: [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ]
    })
      .select("-password -otp -otpExpired -token")
      .limit(20);

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No admins found"
      });
    }

    return res.status(200).json({
      success: true,
      results: admins,
      message: "Admin(s) found"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

// Get admin by ID
export const getAdminById = async (req, res) => {
  try {
    const adminId = req.params.id;

    const admin = await Admin.findById(adminId)
      .select("-password -otp -otpExpired -token");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Block admin
export const blockAdmin = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { isBlocked: true },
      { new: true }
    ).select("-password -otp -otpExpired -token");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin blocked successfully",
      data: admin
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Unblock admin
export const unblockAdmin = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { isBlocked: false },
      { new: true }
    ).select("-password -otp -otpExpired -token");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin unblocked successfully",
      data: admin
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get admin statistics
export const getAdminStats = async (req, res) => {
  try {
    const total = await Admin.countDocuments();
    const verified = await Admin.countDocuments({ isVerified: true });
    const loggedIn = await Admin.countDocuments({ isLoggedIn: true });
    const blocked = await Admin.countDocuments({ isBlocked: true });

    return res.status(200).json({
      success: true,
      data: {
        total,
        verified,
        loggedIn,
        blocked
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const refreshAdminToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required"
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY || process.env.SECRET_KEY);
      const admin = await Admin.findById(decoded.id);

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Admin not found"
        });
      }

      const newAccessToken = jwt.sign({ id: admin._id }, process.env.SECRET_KEY, { expiresIn: "10m" });

      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        accessToken: newAccessToken
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token"
      });
    }
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
