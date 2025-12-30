import express from "express";
import { addCategory, getCategory, deleteCategory, updateCategory, updateCategoryDiscount, removeCategoryDiscount, getCategoryDiscount, searchCategory } from "../controllers/categoryControllers.js";
import { uploadCategoryImage } from "../config/categoryImage.js";
import { adminAuthentication } from "../middleware/isAuthentication.js";

const router = express.Router();

router.post("/", uploadCategoryImage.single("image"), addCategory);
router.get("/", getCategory);
router.delete("/:id", adminAuthentication, deleteCategory);
router.put("/:id", adminAuthentication, uploadCategoryImage.single("image"), updateCategory);
router.get('/searchcategory',searchCategory);

// discount endpoints
router.put('/:id/discount', adminAuthentication, updateCategoryDiscount);
router.delete('/:id/discount', adminAuthentication, removeCategoryDiscount);
router.get('/:id/discount', getCategoryDiscount);

export default router;
