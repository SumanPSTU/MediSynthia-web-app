import { sendOtpMailAdmin } from '../email/sendOtpMailAdmin.js';
import { Admin } from '../models/adminModel.js';
import { Session } from '../models/sessionModel.js';
import { User } from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mailVerification from '../email/mailVerification.js';
import { sendOtpMail } from '../email/sendOtpMail.js';

// Register Admin
export const registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const phone = "xxxxx";
    
    console.log(username,email,password);

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
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
    mailVerification(token, email);
    admin.token = token;
    await admin.save();

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully. Please verify your email",
      data: admin,
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
  }catch (error) {
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

    const accessToken = jwt.sign({ id: admin._id }, process.env.SECRET_KEY, { expiresIn: "10d" });
    const refreshToken = jwt.sign({ id: admin._id }, process.env.SECRET_KEY, { expiresIn: "30d" });

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
    const userId = req.userId;
    await Session.deleteMany({ userId });
    await Admin.findByIdAndUpdate(userId, { isLoggedIn: false });

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
    admin.otpExpired = Date.now() + 10 * 60 * 1000; // 10 minutes
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

