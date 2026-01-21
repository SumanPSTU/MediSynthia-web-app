import express from 'express';
import { getProduct,getProductById , addProduct,updateProduct,deleteProduct,isAvailable,searchProducts,updateProductDiscount,removeProductDiscount,getProductDiscount } from '../controllers/productController.js';
import { uploadProductImage } from '../config/multerConfig.js';
import { adminAuthentication } from '../middleware/isAuthentication.js';


const router = express.Router();

router.get('/getproduct', getProduct);
router.get('/search', searchProducts);
router.get('/getproduct/:id',getProductById);
router.post('/addproduct',adminAuthentication,uploadProductImage.single('file'),addProduct)
router.put('/updateproduct/:id',adminAuthentication,uploadProductImage.single('file'),updateProduct);
router.delete('/deleteproduct/:id',adminAuthentication,deleteProduct);
router.put('/isavailable/:id',adminAuthentication,isAvailable);
router.put('/discount/:id',adminAuthentication,updateProductDiscount);
router.delete('/discount/:id',adminAuthentication,removeProductDiscount);
router.get('/discount/:id',getProductDiscount);

export default router;
