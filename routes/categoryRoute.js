import express from "express";
import { addCategory, getCategory, deleteCategory, updateCategory } from "../controllers/categoryControllers.js";
import { uploadCategoryImage } from "../config/categoryImage.js";

const router = express.Router();

router.post("/", uploadCategoryImage.single("image"), addCategory);
router.get("/", getCategory);
router.delete("/:id", deleteCategory);
router.put("/:id", uploadCategoryImage.single("image"), updateCategory);

export default router;
