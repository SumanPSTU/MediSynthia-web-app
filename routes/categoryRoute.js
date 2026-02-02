import express from "express";
import { addCategory, getCategory, deleteCategory, updateCategory,  searchCategory } from "../controllers/categoryControllers.js";
import { uploadCategoryImage } from "../config/categoryImage.js";
import { adminAuthentication } from "../middleware/isAuthentication.js";

const router = express.Router();

router.post("/", uploadCategoryImage.single("image"), addCategory);
router.get("/", getCategory);
router.get("/admin/",adminAuthentication, getCategory);
router.delete("/:id", adminAuthentication, deleteCategory);
router.put("/:id", adminAuthentication, uploadCategoryImage.single("image"), updateCategory);
router.get('/searchcategory',searchCategory);


export default router;
