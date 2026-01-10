import { adminLoggedIn, adminOTPVerify, changePassword, forgetPassword, getAllUser, logoutAdmin, registerAdmin, resendOtp, searchUser, verification, verifyOtp } from '../controllers/adminController.js';

import express from 'express'
import { adminAuthentication } from '../middleware/isAuthentication.js';
import {deletePrescriptionsBeforeDate} from '../controllers/prescriptionController.js'
import { getUserPrescriptions,getAllPrescriptions, deletePrescription } from '../controllers/prescriptionController.js';
const router = express.Router()


router.post('/register', registerAdmin);
router.post('/verify', verification);
router.post('/login', adminLoggedIn);
router.post('/verify/:email', adminOTPVerify);
router.post('/resend-otp/:email', resendOtp);
router.get('/alluser'/*, adminAuthentication*/, getAllUser);
router.get('/search-user',searchUser)
router.post('/logout', adminAuthentication, logoutAdmin);
router.post('/forget', adminAuthentication, forgetPassword);
router.post('/verifyotp/:email', verifyOtp);
router.post('/changepass/:email',changePassword);




router.post('/getuser',adminAuthentication,getAllUser);
router.get('/get-prescription',adminAuthentication,getUserPrescriptions);
router.get('/get-all-prescription',adminAuthentication,getAllPrescriptions);
router.delete('/delete-prescription',adminAuthentication,deletePrescription);
router.delete("/admin/delete-prescriptions-before-date", adminAuthentication, deletePrescriptionsBeforeDate);


export default router;