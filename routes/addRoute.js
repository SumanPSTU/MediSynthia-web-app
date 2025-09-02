
import express from 'express'
import {adminAuthentication} from '../middleware/isAuthentication.js'
import { setAdd,getAdds,updateAdd,deleteAdd,toggleActiveStatus } from '../controllers/addController.js';
import { uploads } from '../config/multerConfig.js';
const router = express.Router()

router.post('/setadd',adminAuthentication,uploads.single('file'),setAdd);
router.get('/get',getAdds);
router.put('/update/:id',adminAuthentication,uploads.single('file'),updateAdd);
router.delete('/delete/:id',adminAuthentication,deleteAdd)
router.patch('/status/:id',adminAuthentication,toggleActiveStatus)

export default router;