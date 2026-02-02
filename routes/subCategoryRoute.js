import express from "express";
import {
  addSubCategory,
  getAllSubCategories,
  getSubCategory,
  getSubCategoriesByCategory,
  updateSubCategory,
  deleteSubCategory,
  
} from "../controllers/subCategoryController.js";
import { uploadSubCategoryImage } from "../config/subCategoryImage.js";
import { adminAuthentication } from "../middleware/isAuthentication.js";

const router = express.Router();

router.post("/", uploadSubCategoryImage.single("image"), addSubCategory);
router.get("/", getAllSubCategories);
router.get("/admin/",adminAuthentication, getAllSubCategories);
router.get("/:id", getSubCategory);
router.get("/by-category/:categoryId", getSubCategoriesByCategory);
router.put("/:id", adminAuthentication, uploadSubCategoryImage.single("image"), updateSubCategory);
router.delete("/:id", adminAuthentication, deleteSubCategory);



export default router;
