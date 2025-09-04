import express from 'express'
import { deletePrescription, getUserPrescriptions, updatePrescription, uploadPrescription } from '../controllers/prescriptionController.js';
import { userAuthentication } from '../middleware/isAuthentication.js';
import { uploads } from '../config/prescriptionUploadConfig.js';
const router =express.Router()

router.post('/upload',userAuthentication,uploads.single('file'),uploadPrescription);
router.put('/update',userAuthentication,updatePrescription);
router.delete('/delete/:id',userAuthentication,deletePrescription);
router.get('/get-prescription',userAuthentication,getUserPrescriptions)

export default router;