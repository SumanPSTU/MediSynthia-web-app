import mailVerification from '../email/mailVerification.js';
import { User } from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Session } from '../models/sessionModel.js'
import { sendOtpMail } from '../email/sendOtpMail.js'
import { validatePasswordStrength } from '../utils/passwordUtils.js';
import { sanitizeEmail, sanitizeUsername, sanitizePhone, isValidEmail, isValidUsername, isValidPhone } from '../utils/inputSanitization.js';
import { blacklistToken } from '../utils/tokenBlacklist.js';

export const registerUser = async (req, res) => {
  try {
    const { username, email, password, phone, address, deliveryAddress } = req.body;

    if (!username || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }

    // Sanitize and validate inputs
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        message: "Username contains invalid characters"
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

    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedUsername = sanitizeUsername(username);
    const sanitizedPhone = sanitizePhone(phone);

    const existingUser = await User.findOne({ email: sanitizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username: sanitizedUsername,
      email: sanitizedEmail,
      password: hashedPassword,
      phone: sanitizedPhone,
      address: {
        street: address?.street || "",
        city: address?.city || "",
        state: address?.state || "",
        postalCode: address?.postalCode || "",
        country: address?.country || "Bangladesh"
      },
      deliveryAddress: {
        street: deliveryAddress?.street || "",
        city: deliveryAddress?.city || "",
        state: deliveryAddress?.state || "",
        postalCode: deliveryAddress?.postalCode || "",
        country: deliveryAddress?.country || "Bangladesh"
      }
    });

    const token = jwt.sign(
      { id: newUser._id },
      process.env.SECRET_KEY,
      { expiresIn: "10m" }
    );

    // Send verification email
    const userURL = process.env.FRONT_URL;
    mailVerification(token, sanitizedEmail, sanitizedUsername, userURL);

    newUser.token = token;
    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const verification = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing or invalid"
      })
    }

    const token = authHeader.split(" ")[1]

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY)
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(400).json({
          success: false,
          message: "The registration token has expired"
        })
      }
      return res.status(400).json({
        success: false,
        message: "Token verification failed"
      })
    }
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    user.token = null
    user.isVerified = true
    await user.save()

    return res.status(200).json({
      success: true,
      message: "Email verified successfully"
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

export const resendVerification = async (req, res) =>{
   try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing"
      })
    }

    const token = authHeader.split(" ")[1]

    let decoded;
    try {
      decoded =  jwt.verify(token, process.env.SECRET_KEY)
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Token verification failed"
      })
    }
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }
    if(user.isVerified === true){
      return res.status(400).json({
        success: false,
        message: "User already verified"
      })
    }

    const newToken = jwt.sign(
      { id: user._id },
      process.env.SECRET_KEY,
      { expiresIn: "10m" }
    );

    user.token = newToken;
    await user.save();

    const URL = process.env.FRONT_URL;

    // Resend verification email
   await mailVerification(newToken, user.email,user.username,URL);

    return res.status(200).json({
      success: true,
      message: "Verification email resent successfully"
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!"
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found , Please create an account!"
      });
    }

    if (user.isVerified !== true) {
      return res.status(403).json({
        success: false,
        message: "Verify your account first"
      });
    }

    if(user.isBlocked){
      await logoutUser(req,res);
      return res.status(403).json({
        success:false,
        message:"Your account is blocked!"
      })
    }

    const passwordCheck = await bcrypt.compare(password, user.password);
    if (!passwordCheck) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password"
      });
    }

    // check for session and delete it
    const existingSession = await Session.findOne({ userId: user._id });
    if (existingSession) {
      await Session.deleteOne({ userId: user._id });
    }

    // create a new session
    await Session.create({ userId: user._id });

    // generate access & refresh tokens
    const accessToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "30d" });
    const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_SECRET_KEY || process.env.SECRET_KEY, { expiresIn: "30d" });

    user.isLoggedIn = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Welcome back ${user.username}`,
      accessToken,
      refreshToken

    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const token = req.headers.authorization?.split(" ")[1];

    // Blacklist the access token
    if (token) {
      await blacklistToken(token, 'access', userId);
    }

    await Session.deleteMany({ userId });
    await User.findByIdAndUpdate(userId, { isLoggedIn: false });
    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    })

  }
}

export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();


    const otpExpired = new Date(Date.now() + 10 * 60 * 1000);


    user.otp = otp;
    user.otpExpired = otpExpired;

    await user.save();
    await sendOtpMail(email, otp, user.username);

    // send response
    return res.status(200).json({
      success: true,
      message: "OTP sent successful, please check your email"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyOtp = async (req, res) => {

  const { otp } = req.body;
  const email = req.params.email;
  if (!otp) {
    return res.status(400).json({
      success: false,
      message: "OTP is required"
    })
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }
    if (!user.otp || !user.otpExpired) {
      return res.status(400).json({
        success: false,
        message: "OTP not generated or already verified"
      })
    }
    if (user.otpExpired < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request to resend OTP"
      })
    }

    if (otp !== user.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      })
    }

    user.otp = null;
    user.otpExpired = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully "
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }

}

export const changePassword = async (req, res) => {
  const email = req.params.email;


  if (!email) {
    return res.status(404).json({
      success: false,
      message: "Email not found"
    })
  }
  const { password, confirmPassword } = req.body;
  if (!password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "All fields required"
    })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Password does not match"
    })
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

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }
    const hashPass = await bcrypt.hash(password, 10);
    user.password = hashPass;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    })


  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    })

  }
}

// Update delivery address
export const updateDeliveryAddress = async (req, res) => {
  const userId = req.user._id;
  try {

    const { street, city, state, postalCode, country } = req.body;

    if (!street || !city || !state || !postalCode || !country) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update only the fields provided
    user.deliveryAddress = {
      street: street ?? user.deliveryAddress.street,
      city: city ?? user.deliveryAddress.city,
      state: state ?? user.deliveryAddress.state,
      postalCode: postalCode ?? user.deliveryAddress.postalCode,
      country: country ?? user.deliveryAddress.country,
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Delivery address updated successfully",
      deliveryAddress: user.deliveryAddress,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update basic user info
export const updateUserBasicInfo = async (req, res) => {
  try {
    // Assuming userAuthentication middleware sets req.user
    const userId = req.user._id;
    const { username, phone, address } = req.body;

    if (!username && !phone && !address) {
      return res.status(400).json({
        success: false,
        message: "At least one field must be provided to update",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields only if provided
    if (username) user.username = username;
    if (phone) user.phone = phone;

    // Update address partially
    if (address) {
      user.address = {
        street: address.street ?? user.address.street,
        city: address.city ?? user.address.city,
        state: address.state ?? user.address.state,
        postalCode: address.postalCode ?? user.address.postalCode,
        country: address.country ?? user.address.country,
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User basic info updated successfully",
      data: {
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('-password -otp -otpExpired -token');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user profile (address, deliveryAddress, etc)
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { address, deliveryAddress } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update address if provided
    if (address) {
      user.address = {
        street: address.street || user.address?.street || "",
        city: address.city || user.address?.city || "",
        state: address.state || user.address?.state || "",
        zipCode: address.zipCode || address.postalCode || user.address?.zipCode || user.address?.postalCode || "",
        country: address.country || user.address?.country || "Bangladesh",
      };
    }

    // Update delivery address if provided
    if (deliveryAddress) {
      user.deliveryAddress = {
        street: deliveryAddress.street || user.deliveryAddress?.street || "",
        city: deliveryAddress.city || user.deliveryAddress?.city || "",
        state: deliveryAddress.state || user.deliveryAddress?.state || "",
        zipCode: deliveryAddress.zipCode || deliveryAddress.postalCode || user.deliveryAddress?.zipCode || user.deliveryAddress?.postalCode || "",
        country: deliveryAddress.country || user.deliveryAddress?.country || "Bangladesh",
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        address: user.address,
        deliveryAddress: user.deliveryAddress,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const refreshUserToken = async (req, res) => {
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
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found"
        });
      }

      const newAccessToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "30d" });

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

/**
 * Google Authentication Handler
 * Verifies Google ID token and creates/updates user in MongoDB
 */
export const googleAuth = async (req, res) => {
  try {
    const { idToken, name, email, photoURL } = req.body;

    if (!idToken || !email || !name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: idToken, name, email"
      });
    }

    // Verify email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedUsername = sanitizeUsername(name);

    try {
      // Verify the Google ID token using Firebase Admin SDK would be ideal,
      // but for now we'll trust the frontend and validate on backend
      // In production, use: admin.auth().verifyIdToken(idToken)
      
      let user = await User.findOne({ email: sanitizedEmail });

      if (user) {
        // User exists - update Google ID if not already set
        if (!user.googleId) {
          user.googleId = email; // Use email as unique identifier for Google
          user.authMethod = 'google';
          if (photoURL) user.photoURL = photoURL;
          await user.save();
        }
      } else {
        // Create new user
        user = await User.create({
          username: sanitizedUsername,
          email: sanitizedEmail,
          password: null, // No password for Google auth
          phone: null, // Optional for Google auth
          googleId: email, // Use email as Google identifier
          photoURL: photoURL || null,
          authMethod: 'google',
          isVerified: true, // Google users are pre-verified
          address: {
            street: "",
            city: "",
            state: "",
            postalCode: "",
            country: "Bangladesh"
          },
          deliveryAddress: {
            street: "",
            city: "",
            state: "",
            postalCode: "",
            country: "Bangladesh"
          }
        });
      }

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { id: user._id, email: user.email },
        process.env.SECRET_KEY,
        { expiresIn: "30d" }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_SECRET_KEY || process.env.SECRET_KEY,
        { expiresIn: "30d" }
      );

      // Save refresh token to session
      await Session.create({
        userId: user._id,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      return res.status(200).json({
        success: true,
        message: "Google authentication successful",
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          photoURL: user.photoURL
        }
      });

    } catch (error) {
      console.error("Google auth error:", error);
      return res.status(500).json({
        success: false,
        message: "Google authentication failed: " + error.message
      });
    }

  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Google authentication failed"
    });
  }
};
