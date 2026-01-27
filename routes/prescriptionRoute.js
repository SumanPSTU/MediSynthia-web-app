import express from 'express'
import { deletePrescription, getAllPrescriptions, getPrescriptionsByUserId, updatePrescription, uploadPrescription } from '../controllers/prescriptionController.js';
import { userAuthentication, adminAuthentication } from '../middleware/isAuthentication.js';
import { uploads } from '../config/prescriptionUploadConfig.js';
const router =express.Router()

router.post('/upload',userAuthentication,uploads.single('file'),uploadPrescription);
router.put('/update',userAuthentication,updatePrescription);
router.delete('/delete/:id',userAuthentication,deletePrescription);
router.get('/user/:userId', adminAuthentication, getPrescriptionsByUserId);
// router.get('/get-prescription',userAuthentication,getAllPrescriptions)

export default router;
