import { Category } from "../models/categoryModels.js";
import fs from "fs";
import path from "path";

const CATEGORY_DIR = path.join(process.cwd(), "uploads/category");

//  Add category with image
export const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const file = req.file;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = new Category({
      name,
      description,
      imageUrl: file ? `/uploads/category/${file.filename}` : null,
    });

    await category.save();

    res.status(201).json({ message: "Category created", category });
  } catch (error) {
    res.status(500).json({ message: "Error adding category", error: error.message });
  }
};

//  Get all categories
export const getCategory = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching categories", error: error.message });
  }
};

// Update category (replace image if new uploaded)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const file = req.file;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (file) {
      // delete old image if exists
      if (category.imageUrl) {
        const oldFilePath = path.join(CATEGORY_DIR, path.basename(category.imageUrl));
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      category.imageUrl = `/uploads/category/${file.filename}`;
    }

    if (name) category.name = name;
    if (description) category.description = description;

    await category.save();

    res.status(200).json({ message: "Category updated", category });
  } catch (error) {
    res.status(500).json({ message: "Error updating category", error: error.message });
  }
};



//  Delete category (with image cleanup)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // 🗑 Delete image if exists
    if (category.imageUrl) {
      const filePath = path.join(CATEGORY_DIR, path.basename(category.imageUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await category.deleteOne();

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting category", error: error.message });
  }
};
