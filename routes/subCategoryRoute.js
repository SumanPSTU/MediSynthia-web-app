import express from "express";
import {
  addSubCategory,
  getAllSubCategories,
  getSubCategory,
  getSubCategoriesByCategory,
  updateSubCategory,
  deleteSubCategory,
  updateSubCategoryDiscount,
  removeSubCategoryDiscount,
  getSubCategoryDiscount
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

// discount endpoints
router.put('/:id/discount', adminAuthentication, updateSubCategoryDiscount);
router.delete('/:id/discount', adminAuthentication, removeSubCategoryDiscount);
router.get('/:id/discount', getSubCategoryDiscount);

export default router;
