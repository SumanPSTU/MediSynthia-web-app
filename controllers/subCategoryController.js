import mongoose from "mongoose";
import { SubCategory } from "../models/subCategoryModel.js";
import { Products } from "../models/productModel.js";
import fs from "fs";
import path from "path";

const CATEGORY_DIR = path.resolve("uploads/subCategory");

export const addSubCategory = async (req, res) => {
  try {
    const { name, category, description, discountPercentage } = req.body;
    const file = req.file;

    if (category && !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    let imageUrl = null;
    if (file) {
      imageUrl = `/uploads/subCategory/${file.filename}`;
    }

    const subCategory = new SubCategory({
      name,
      category,
      description,
      discountPercentage: discountPercentage || 0,
      imageUrl,
    });

    await subCategory.save();
    if(discountPercentage !== undefined && discountPercentage !== null){
      await updateProduct(subCategory._id,discountPercentage);
    }

    res.status(201).json({
      success: true,
      message: "Subcategory created successfully",
      subCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating subcategory",
      error: error.message,
    });
  }
};


// -------------------------
// Get All Subcategories
// -------------------------
export const getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find()
      .populate("category")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subCategories.length,
      subCategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching subcategories",
      error: error.message,
    });
  }
};

// -------------------------
// Get Single Subcategory by ID
// -------------------------
export const getSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid subcategory ID" });
    }

    const subCategory = await SubCategory.findById(id).populate("category");

    if (!subCategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    res.status(200).json({ success: true, subCategory });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching subcategory",
      error: error.message,
    });
  }
};

// -------------------------
// Get Subcategories by Category
// -------------------------
export const getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const subCategories = await SubCategory.find({ category: categoryId })
      .populate("category")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subCategories.length,
      subCategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching subcategories by category",
      error: error.message,
    });
  }
};
// -------------------------
// Update Subcategory
// -------------------------
export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description } = req.body;
    const discountPercentage =
      req.body.discountPercentage !== undefined
        ? Number(req.body.discountPercentage)
        : undefined;

    const file = req.file;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid subcategory ID" });
    }

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    if (category && !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    // Replace old image if a new one is uploaded
    if (file) {
      if (subCategory.imageUrl) {
        const oldFilePath = path.join(
          CATEGORY_DIR,
          path.basename(subCategory.imageUrl)
        );
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      subCategory.imageUrl = `/uploads/subCategory/${file.filename}`;
    }

    if (name) subCategory.name = name;
    if (category) subCategory.category = category;
    if (description) subCategory.description = description;

    if (discountPercentage !== undefined) {
      if (
        isNaN(discountPercentage) ||
        discountPercentage < 0 ||
        discountPercentage > 100
      ) {
        return res
          .status(400)
          .json({ message: "discountPercentage must be a number between 0 and 100" });
      }

      subCategory.discountPercentage = discountPercentage;
    }

    await subCategory.save();
    if(discountPercentage !== undefined){
      await updateProduct(subCategory._id,discountPercentage);
    }
    res.status(200).json({
      success: true,
      message: "Subcategory updated successfully",
      subCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating subcategory",
      error: error.message,
    });
  }
};


// -------------------------
// Delete Subcategory
// -------------------------
export const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid subcategory ID" });
    }

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    // Delete image if exists
    if (subCategory.imageUrl) {
      const filePath = path.join(
        CATEGORY_DIR,
        path.basename(subCategory.imageUrl)
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await subCategory.deleteOne();

    res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting subcategory",
      error: error.message,
    });
  }
};

const updateProduct = async (subCategoryId,discountPercentage) => {
  try {
    // Update all products under this subcategory
    const product = await Products.find({ subCategory: subCategoryId });
    if(!product) return;
    await Products.updateMany(
      { subCategory: subCategoryId },
      { $set: { discountPercentage: discountPercentage } }
    ); 
  }
  catch (error) {
    console.error("Error updating products' discountPercentage:", error);
  }
};


