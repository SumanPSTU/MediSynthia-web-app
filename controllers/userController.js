import mailVerification from '../email/mailVerification.js';
import { User } from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Session } from '../models/sessionModel.js'
import { sendOtpMail } from '../email/sendOtpMail.js'

export const registerUser = async (req, res) => {
  try {
    const { username, email, password, phone, address, deliveryAddress } = req.body;

    if (!username || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      phone,
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
    mailVerification(token, email,newUser.username);

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
      decoded =await jwt.verify(token, process.env.SECRET_KEY)
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

    // Resend verification email
   await mailVerification(newToken, user.email,user.username);

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

    const passwordCheck = await bcrypt.compare(password, user.password);
    if (!passwordCheck) {
      return res.status(402).json({
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
    const refreshToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "30d" });

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
    await Session.deleteMany({ userId });
    await User.findByIdAndUpdate(userId, { isLoggedIn: false });
    res.status(200).json({
      success: true,
      messege: "Logged out successfully"
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      messege: err.message
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
      messege: "OTP is required"
    })
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        messege: "User not found"
      })
    }
    if (!user.otp || !user.otpExpired) {
      return res.status(400).json({
        success: false,
        messege: "OTP not generated or already verified"
      })
    }
    if (user.otpExpired < new Date()) {
      return res.status(400).json({
        success: false,
        messege: "OTP has expired. Please request to resend OTP"
      })
    }

    if (otp !== user.otp) {
      return res.status(400).json({
        success: false,
        messege: "Invalid OTP"
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
      messege: "Email not found"
    })
  }
  const { password, confirmPassword } = req.body;
  if (!password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "All filed required"
    })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Password does not match"
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
      messege: error.message
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


