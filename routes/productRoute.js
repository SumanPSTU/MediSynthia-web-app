import express from 'express';
import { getProduct , addProduct,updateProduct,deleteProduct,isAvailable,searchProducts } from '../controllers/productController.js';
import { uploads } from '../config/multerConfig.js';
import { adminAuthentication } from '../middleware/isAuthentication.js';


const router = express.Router();

router.get('/getproduct', getProduct);
router.get('/search', searchProducts);
router.post('/addproduct',adminAuthentication,uploads.single('file'),addProduct)
router.put('/updateproduct/:id',adminAuthentication,uploads.single('file'),updateProduct);
router.delete('/deleteproduct/:id',adminAuthentication,deleteProduct);
router.patch('/isavailable/:id',adminAuthentication,isAvailable);

export default router; 
