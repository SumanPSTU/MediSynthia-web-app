
import express from 'express'
import {adminAuthentication} from '../middleware/isAuthentication.js'
import { setAdd,getAdds,updateAdd,deleteAdd,toggleActiveStatus, getAllBanners } from '../controllers/addController.js';
import {uploadCarouselImage} from "../config/carosalImage.js"
const router = express.Router()

router.post('/setadd',adminAuthentication,uploadCarouselImage.single('file'),setAdd);
router.get('/get',getAdds);
router.get('/getallBanner',getAllBanners)
router.get('/getall-carosal',adminAuthentication,getAllBanners)
router.put('/update/:id',adminAuthentication,uploadCarouselImage.single('file'),updateAdd);
router.delete('/delete/:id',adminAuthentication,deleteAdd)
router.patch('/status/:id',adminAuthentication,toggleActiveStatus)

export default router;