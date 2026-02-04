import { adminLoggedIn, adminOTPVerify, blockUser, blockAdmin, changePassword, forgetPassword, getAllAdmins, getAdminById, getAdminStats, getAllUser, logoutAdmin, registerAdmin, resendOtp, searchAdmin, searchUser, unblockUser, unblockAdmin, verification, verifyOtp, resendMailForVerification, refreshAdminToken } from '../controllers/adminController.js';
import { replyToComment, getCommentsByProductAdmin } from '../controllers/commentComtroller.js';

import express from 'express'
import { adminAuthentication } from '../middleware/isAuthentication.js';
import { createRateLimiter, createEmailRateLimiter } from '../middleware/rateLimiter.js';
import {deletePrescriptionsBeforeDate, getPrescriptionById, updatePrescriptionStatus} from '../controllers/prescriptionController.js'
import { getAllPrescriptions, deletePrescription } from '../controllers/prescriptionController.js';
import { getCommentsByProduct,updateComment,deleteComment } from '../controllers/commentComtroller.js';
const router = express.Router()

// Rate limiters
const registerLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
const loginLimiter = createRateLimiter(3, 60 * 1000); // 3 attempts per 60 seconds
const emailLimiter = createEmailRateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour

router.post('/register', registerLimiter, registerAdmin);
router.post('/verify', verification);
router.post('/resend-email/:email', emailLimiter, resendMailForVerification)
router.post('/login', loginLimiter, adminLoggedIn);
router.post('/refresh-token', refreshAdminToken);
router.post('/verify/:email', emailLimiter, adminOTPVerify);
router.post('/resend-otp/:email', emailLimiter, resendOtp);
router.get('/alluser', adminAuthentication, getAllUser);
router.get('/search-user',searchUser)
router.patch('/block-user/:userId', adminAuthentication, blockUser);
router.patch('/unblock-user/:userId', adminAuthentication, unblockUser);
router.post('/logout', adminAuthentication, logoutAdmin);
router.post('/forget', forgetPassword);
router.post('/verifyotp/:email', verifyOtp);
router.post('/changepass/:email',changePassword);


router.get('/getuser',adminAuthentication,getAllUser);
// router.get('/get-prescription',adminAuthentication,getUserPrescriptions);
router.get('/get-all-prescription',adminAuthentication,getAllPrescriptions);
router.get('/prescription/:id', adminAuthentication, getPrescriptionById);
router.put('/prescription/:id/status', adminAuthentication, updatePrescriptionStatus);
router.delete('/delete-prescription', adminAuthentication, deletePrescription);
router.delete("/delete-prescriptions-before-date", adminAuthentication, deletePrescriptionsBeforeDate);

// ================= ADMIN MANAGEMENT ROUTES =================
router.get('/all-admin', adminAuthentication, getAllAdmins);
router.get('/search-admin', adminAuthentication, searchAdmin);
router.get('/admin/:id', adminAuthentication, getAdminById);
router.patch('/block-admin/:adminId', adminAuthentication, blockAdmin);
router.patch('/unblock-admin/:adminId', adminAuthentication, unblockAdmin);
router.get('/admin-stats', adminAuthentication, getAdminStats);
// comment check as a admin
router.post("/comment/reply/:commentId",adminAuthentication,replyToComment)
router.get("/comment/:productId",adminAuthentication, getCommentsByProduct);
router.put("/comment/:id",adminAuthentication, updateComment);
router.delete("/comment/:id", adminAuthentication, deleteComment);





export default router;

