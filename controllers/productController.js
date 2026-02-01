import { Products } from "../models/productModel.js";
import { Category } from "../models/categoryModels.js";
import mongoose from "mongoose";
import fs from "fs";
import path from 'path'
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;
    const subCategory = req.query.subCategory;
    const search = req.query.search;
    const exclude = req.query.exclude;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (search) {
      // Use regex to search for products where the name contains the search term
      // This will match "Ace" with "Ace", "Ace Plus", "Ace Pro", etc.
      filter.productName = { $regex: `\\b${search}`, $options: 'i' };
    }
    // Exclude current product by ID
    if (exclude && mongoose.Types.ObjectId.isValid(exclude)) {
      filter._id = { $ne: new mongoose.Types.ObjectId(exclude) };
    }

    const products = await Products.find(filter)
      .skip(skip)
      .limit(limit)
      .populate('category')
      .populate('subCategory');
    const total = await Products.countDocuments(filter);

    // Return empty array with success if no products found (instead of 404)
    if (!products || products.length === 0) {
      return res.status(200).json({
        success: true,
        page,
        limit,
        totalProducts: 0,
        totalPages: 0,
        products: []
      });
    }

    const computeEffectivePrice = (p) => {
      const price = Number(p.productPrice) || 0;
      const prodDisc = Number(p.discountPercentage) || 0;
      const subDisc = p.subCategory ? Number(p.subCategory.discountPercentage || 0) : 0;
      const catDisc = p.category ? Number(p.category.discountPercentage || 0) : 0;

      let applied = 0;
      if (prodDisc > 0) applied = prodDisc;
      else if (subDisc > 0) applied = subDisc;
      else if (catDisc > 0) applied = catDisc;

      const effective = +(price * (1 - applied / 100)).toFixed(2);
      return { originalPrice: price, discountPercentage: applied, effectivePrice: effective };
    };

    const productsWithPrice = products.map(p => {
      const priceInfo = computeEffectivePrice(p);
      return { ...p.toObject(), priceInfo };
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalProducts: total,
      totalPages: Math.ceil(total / limit),
      products: productsWithPrice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    const product = await Products.findById(id)
      .populate("category")
      .populate("subCategory").populate("supplier");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      product
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

    const imageUrl = `/uploads/products/${file.filename}`;
    const data = req.body;

    // Validate required fields
    if (!data.productName || !data.productPrice) {
      return res.status(400).json({
        success: false,
        message: "Product name and price are required",
      });
    }

    // Parse and validate productPrice
    const price = Number(data.productPrice);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "productPrice must be a non-negative number",
      });
    }

    // Parse and validate discountPercentage
    let discount = 0;
    if (data.discountPercentage !== undefined) {
      discount = Number(data.discountPercentage);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({
          success: false,
          message: "discountPercentage must be between 0 and 100",
        });
      }
    }

    // Helper to clean empty ObjectId fields
    const cleanObjectId = (val) => {
      if (!val || val === "") return undefined;
      return mongoose.Types.ObjectId.isValid(val) ? val : undefined;
    };

    const newProduct = await Products.create({
      productId: data.productId || undefined,
      productName: data.productName.trim(),
      productGeniric:data.productGeniricName || undefined,
      productSuplier: data.productSuplier || undefined,

      strength: data.strength || undefined,
      dose: data.dose || undefined,

      category: cleanObjectId(data.category),
      subCategory: cleanObjectId(data.subCategory),
      supplier: cleanObjectId(data.supplier),

      productImgUrl: imageUrl,
      productDescription: data.productDescription || undefined,
      sideEffect: data.sideEffect || undefined,

      productPrice: price,
      discountPercentage: discount,
      isAvailable: data.isAvailable === "true" || data.isAvailable === true,
    });

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      newProduct,
    });

  } catch (error) {
    console.error("Add product error:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding product",
      error: error.message,
    });
  }
};



export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid Product ID is required",
      });
    }

    const data = req.body;

    const product = await Products.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Helper: clean ObjectId fields
    const cleanObjectId = (val) => {
      if (!val || val === "") return undefined;
      return mongoose.Types.ObjectId.isValid(val) ? val : undefined;
    };

    // Build only allowed updated fields
    const updatedFields = {
      productName: data.productName?.trim(),
      productGeniric: data.productGeniricName || undefined,
      productSuplier: data.productSuplier || undefined,
      strength: data.strength || undefined,
      dose: data.dose || undefined,

      category: cleanObjectId(data.category),
      subCategory: cleanObjectId(data.subCategory),
      supplier: cleanObjectId(data.supplier),

      productDescription: data.productDescription || undefined,
      sideEffect: data.sideEffect || undefined,

      isAvailable: data.isAvailable === "true" || data.isAvailable === true,
    };

    // Price validation (if updating)
    if (data.productPrice !== undefined) {
      const price = Number(data.productPrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "productPrice must be a non-negative number",
        });
      }
      updatedFields.productPrice = price;
    }

    // Discount validation (if updating)
    if (data.discountPercentage !== undefined) {
      const discount = Number(data.discountPercentage);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({
          success: false,
          message: "discountPercentage must be between 0 and 100",
        });
      }
      updatedFields.discountPercentage = discount;
    }

    // Handle image update
    if (req.file) {
      if (product.productImgUrl) {
        const oldImagePath = path.join(__dirname, "..", product.productImgUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Keep same folder structure as addProduct
      updatedFields.productImgUrl = `/uploads/products/${req.file.filename}`;
    }

    // Remove undefined keys so MongoDB won't overwrite fields with undefined
    Object.keys(updatedFields).forEach(
      (key) => updatedFields[key] === undefined && delete updatedFields[key]
    );

    const updatedProduct = await Products.findByIdAndUpdate(
      id,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      updatedProduct,
    });

  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({
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

    const product = await Products.findByIdAndDelete(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
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

// Update product discount percentage
export const updateProductDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { discountPercentage } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    if (discountPercentage === undefined || discountPercentage === null) {
      return res.status(400).json({
        success: false,
        message: "discountPercentage is required"
      });
    }

    const discount = Number(discountPercentage);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      return res.status(400).json({
        success: false,
        message: "discountPercentage must be a number between 0 and 100"
      });
    }

    const product = await Products.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    product.discountPercentage = discount;
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product discount updated successfully",
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating product discount",
      error: error.message
    });
  }
};

// Remove/Reset product discount (set to 0)
export const removeProductDiscount = async (req, res) => {
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

    product.discountPercentage = 0;
    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product discount removed successfully",
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error removing product discount",
      error: error.message
    });
  }
};

// Get product discount details
export const getProductDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    const product = await Products.findById(id).select('_id productName productPrice discountPercentage').populate('category', 'discountPercentage').populate('subCategory', 'discountPercentage');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // compute effective discount
    const computeDiscount = (p) => {
      const prodDisc = Number(p.discountPercentage) || 0;
      const subDisc = p.subCategory ? Number(p.subCategory.discountPercentage || 0) : 0;
      const catDisc = p.category ? Number(p.category.discountPercentage || 0) : 0;

      let applied = 0;
      if (prodDisc > 0) applied = prodDisc;
      else if (subDisc > 0) applied = subDisc;
      else if (catDisc > 0) applied = catDisc;

      const originalPrice = Number(p.productPrice) || 0;
      const discountedPrice = +(originalPrice * (1 - applied / 100)).toFixed(2);

      return {
        productDiscount: prodDisc,
        subCategoryDiscount: subDisc,
        categoryDiscount: catDisc,
        appliedDiscount: applied,
        originalPrice,
        discountedPrice,
        savings: +(originalPrice - discountedPrice).toFixed(2)
      };
    };

    return res.status(200).json({
      success: true,
      product: product.toObject(),
      discountDetails: computeDiscount(product)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching product discount",
      error: error.message
    });
  }
};


export const searchProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim();
    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Search key is required"
      });
    }

     const products = await Products.find({
          $or: [
            { productName: { $regex: `^${search}`, $options: "i" } },
            { productGeniric: { $regex: `^${search}`, $options: "i" } },
            
          ]
        }).limit(20);

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found"
      });
    }

    res.status(200).json({
      success: true,
      products,
      message: "Product(s) found"
    });

  } catch (error) {
    console.error("Error searching product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

// Get product count by category or subCategory
export const getProductCount = async (req, res) => {
  try {
    const { categoryId, subCategoryId } = req.query;

    if (!categoryId && !subCategoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId or subCategoryId is required"
      });
    }

    const filter = {};
    if (categoryId) filter.category = categoryId;
    if (subCategoryId) filter.subCategory = subCategoryId;

    const count = await Products.countDocuments(filter);

    return res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
