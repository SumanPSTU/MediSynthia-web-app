import express from "express";
import {  userAuthentication } from '../middleware/isAuthentication.js'
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
    createComment,
    getCommentsByProduct,
    updateComment,
    deleteComment 
} from "../controllers/commentComtroller.js";
const router = express.Router();


router.post("/register", registerUser);
router.post("/verify", verification);
router.post("/resendverify",resendVerification);


router.post("/login", loginUser);
router.post("/refresh-token", refreshUserToken);
router.post("/logout", userAuthentication, logoutUser);
router.post("/forget", forgetPassword);
router.post("/verifyotp/:email",  verifyOtp)
router.post("/changepass/:email", changePassword)
router.put('/deleveryaddress',userAuthentication,updateDeliveryAddress)
router.put('/updatebasicaddress',userAuthentication,updateUserBasicInfo)
router.put('/profile', userAuthentication, updateUserProfile)
router.get('/profile', userAuthentication, getUserProfile);


router.post("/comment", userAuthentication, createComment);
router.get("/comment/:productId", getCommentsByProduct);
router.put("/comment/:id", userAuthentication, updateComment);
router.delete("/comment/:id", userAuthentication, deleteComment);

export default router; 