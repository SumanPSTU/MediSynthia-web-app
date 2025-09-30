import { Products } from "../models/productModel.js";
import fs from "fs";
import path from 'path'
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;

    const products = await Products.find()
      .skip(skip)
      .limit(limit);
    const total = await Products.countDocuments();

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found"
      });
    }

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalProducts: total,
      totalPages: Math.ceil(total / limit),
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const addProduct = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Product image is required",
      });
    }
    const imageUrl = `/uploads/${file.filename}`;

    const data = req.body;
    if (!data) {
      res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const newProduct = await Products.create({
      productId: data.productId,
      productName: data.productName,
      productGeniric: data.productGeniric,
      strength: data.strength,
      dose: data.dose,
      catagory: data.catagory,
      productImgUrl: imageUrl,
      productDescription: data.productDescription,
      sideEffect: data.sideEffect,
      productPrice: data.productPrice
    });
    res.status(201).json({
      success: true,
      message: "Product added successfully",
      newProduct,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding product",
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        success: false,
        message: "Product ID is required"
      })
    }
    const data = req.body;

    const product = await Products.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let updatedFields = { ...data };

    if (req.file) {
      // Delete old image first
      if (product.productImgUrl) {
        const oldImagePath = path.join(__dirname, "..", product.productImgUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Add new image URL
      updatedFields.productImgUrl = `/uploads/${req.file.filename}`;
    }

    const updatedProduct = await Products.findByIdAndUpdate(
      id,
      updatedFields,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await Products.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Delete image from filesystem first
    if (product.productImgUrl) {
      const imagePath = path.join(__dirname, "..", product.productImgUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete product from DB
    await Products.findByIdAndDelete(productId);

    return res.status(200).json({
      success: true,
      message: "Productd eleted successfully",
    });
  } catch (error) {
    console.error("Delete Product Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error, please try again later",
    });
  }
};

export const isAvailable = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    const product = await Products.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    product.isAvailable = !product.isAvailable;
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      product   // return updated product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search key is required"
      });
    }

    // Escape regex special characters to prevent injection
    const escapedKey = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // MongoDB regex with ^ ensures it matches from the start only
    const products = await Products.find({
      $or: [
        { productName: { $regex: `^${escapedKey}`, $options: "i" } },
        { catagory: { $regex: `^${escapedKey}`, $options: "i" } },
        { productGeniric: { $regex: `^${escapedKey}`, $options: "i" } }
        
      ]
    });

    res.status(200).json({
      success: true,
      results: products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
