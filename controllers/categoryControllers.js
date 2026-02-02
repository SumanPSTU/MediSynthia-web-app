import { Category } from "../models/categoryModels.js";
import { Products } from "../models/productModel.js"
import fs from "fs";
import path from "path";


const CATEGORY_DIR = path.join(process.cwd(), "uploads/category");


export const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const discountPercentage =
      req.body.discountPercentage !== undefined
        ? Number(req.body.discountPercentage)
        : 0;

    const file = req.file;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
      return res.status(400).json({
        message: "discountPercentage must be between 0 and 100",
      });
    }

    const category = new Category({
      name,
      description,
      imageUrl: file ? `/uploads/category/${file.filename}` : null,
      discountPercentage,
    });

    await category.save();
    if (discountPercentage > 0) {
      // Find products in this category first
      const products = await Products.find({ category: category._id });

      if (products.length > 0) {
        await products.updateMany(
          { category: category._id },
          { $set: { discountPercentage } }
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Category created & product discounts updated",
      category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error adding category",
      error: error.message,
    });
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


//search category
export const searchCategory = async (req, res) => {
  try {
    const q = req.params.q?.trim();
    if (!q || q === undefined) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }
    const categories = await Category.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
      ]
    }).limit(20);

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Category found!",
      categories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error searching category",
      error: error.message
    });
  }
}

// Update category (replace image if new uploaded)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const discountPercentage = req.body.discountPercentage !== undefined ? Number(req.body.discountPercentage) : undefined;
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
    if (discountPercentage !== undefined) {
      if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
        return res.status(400).json({ message: "discountPercentage must be a number between 0 and 100" });
      }
      category.discountPercentage = discountPercentage;
    }
    await category.save();

    if (discountPercentage > 0) {
      // Check if any products exist
      const productsExist = await Products.exists({ category: category._id });

      if (productsExist) {
        await Products.updateMany(
          { category: category._id },
          { $set: { discountPercentage } }
        );
        
      } 
    }

    res.status(200).json({
      message: "Category updated", category
    });
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


