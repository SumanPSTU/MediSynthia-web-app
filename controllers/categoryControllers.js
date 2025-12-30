import { Category } from "../models/categoryModels.js";
import fs from "fs";
import path from "path";

const CATEGORY_DIR = path.join(process.cwd(), "uploads/category");

//  Add category with image
export const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const discountPercentage = req.body.discountPercentage !== undefined ? Number(req.body.discountPercentage) : undefined;
    const file = req.file;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    if (discountPercentage !== undefined) {
      if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
        return res.status(400).json({ message: "discountPercentage must be a number between 0 and 100" });
      }
    }

    const category = new Category({
      name,
      description,
      imageUrl: file ? `/uploads/category/${file.filename}` : null,
      discountPercentage: discountPercentage || 0
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


//search category
export const searchCategory = async (req, res) => {
  try {
    const q = req.params.q?.trim();
    if (!q || q === undefined) {
      return res.status(500).json({
        success: false,
        message: ""
      })
    }
    const categories = await Category.find({
      $or: [
        { name: { $regex: `^${search}`, $options: "i" } },
      ]
    }).limit(20);

    if(categories.length === 0){
      return res.status(404).json({
        success:false,
        message:"category not found"
      })
    }
    res.ststus(200).json({
      success:true,
      message:"category found!",
      categories
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Category not found"
    })
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

// Update only discountPercentage for category
export const updateCategoryDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { discountPercentage } = req.body;

    if (discountPercentage === undefined || discountPercentage === null) {
      return res.status(400).json({ success: false, message: 'discountPercentage is required' });
    }

    const disc = Number(discountPercentage);
    if (isNaN(disc) || disc < 0 || disc > 100) {
      return res.status(400).json({ success: false, message: 'discountPercentage must be a number between 0 and 100' });
    }

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    category.discountPercentage = disc;
    await category.save();

    return res.status(200).json({ success: true, message: 'Category discount updated', category });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating category discount', error: error.message });
  }
};

// Remove/reset category discount
export const removeCategoryDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    category.discountPercentage = 0;
    await category.save();

    return res.status(200).json({ success: true, message: 'Category discount removed', category });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error removing category discount', error: error.message });
  }
};

// Get discount details for category
export const getCategoryDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id).select('_id name discountPercentage');
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    return res.status(200).json({ success: true, category });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching category discount', error: error.message });
  }
};

