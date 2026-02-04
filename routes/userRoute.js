import express from "express";
import {  userAuthentication } from '../middleware/isAuthentication.js'
import { createRateLimiter, createEmailRateLimiter, createResendVerificationLimiter } from '../middleware/rateLimiter.js';
import {
    changePassword,
    forgetPassword, loginUser, logoutUser,
    registerUser,
    updateDeliveryAddress,
    updateUserBasicInfo,
    verification,
    verifyOtp,
    resendVerification,
    getUserProfile,
    refreshUserToken,
    googleAuth,
    updateUserProfile
} from "../controllers/userController.js";
import {
    userSchema, 
    validateUser
 } from "../validators/userValidators.js";
import {
    createComment,
    getCommentsByProduct,
    updateComment,
    deleteComment 
} from "../controllers/commentComtroller.js";
const router = express.Router();

// Rate limiters
const registerLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
const loginLimiter = createRateLimiter(100, 1 * 60 * 1000); // 100 attempts per minute (effectively no limit)
const emailLimiter = createEmailRateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour
const resendVerificationLimiter = createResendVerificationLimiter(); // Allow resend after 2 minutes

router.post("/register", registerLimiter, validateUser(userSchema), registerUser);
router.post("/verify", verification);
router.post("/resendverify", resendVerificationLimiter, resendVerification);
router.post("/google-auth", loginLimiter, googleAuth);

router.post("/login", loginLimiter, loginUser);
router.post("/refresh-token", refreshUserToken);
router.post("/logout", userAuthentication, logoutUser);
router.post("/forget", forgetPassword);
router.post("/verifyotp/:email", emailLimiter, verifyOtp)
router.post("/changepass/:email", emailLimiter, changePassword)
router.put('/deleveryaddress',userAuthentication,updateDeliveryAddress)
router.put('/updatebasicaddress',userAuthentication,updateUserBasicInfo)
router.put('/profile', userAuthentication, updateUserProfile)
router.get('/profile', userAuthentication, getUserProfile);


router.post("/comment", userAuthentication, createComment);
router.get("/comment/:productId", getCommentsByProduct);
router.put("/comment/:id", userAuthentication, updateComment);
router.delete("/comment/:id", userAuthentication, deleteComment);

export default router; 