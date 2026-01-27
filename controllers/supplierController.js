import { Supplier } from "../models/supplierModel.js";
import fs from "fs";
import path from "path";

const SUPPLIER_DIR = path.join(process.cwd(), "uploads/suppliers");

// Add supplier
export const addSupplier = async (req, res) => {
  try {
    const { name, description } = req.body;
    const file = req.file;

    if (!name) {
      return res.status(400).json({ message: "Supplier name is required" });
    }

    const existing = await Supplier.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Supplier already exists" });
    }

    const supplier = new Supplier({
      name,
      description,
      imageUrl: file ? `/uploads/suppliers/${file.filename}` : null
    });

    await supplier.save();

    res.status(201).json({ message: "Supplier created", supplier });
  } catch (error) {
    res.status(500).json({ message: "Error creating supplier", error: error.message });
  }
};

// Get all suppliers
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: suppliers.length,
      suppliers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching suppliers", error: error.message });
  }
};

// Get supplier by ID
export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ message: "Error fetching supplier", error: error.message });
  }
};

// Search suppliers
export const searchSuppliers = async (req, res) => {
  try {
    const { q } = req.params;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const suppliers = await Supplier.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } }
      ]
    }).limit(20);

    if (suppliers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No suppliers found"
      });
    }

    res.status(200).json({
      success: true,
      suppliers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching suppliers",
      error: error.message
    });
  }
};

// Update supplier
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const file = req.file;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Check if name is being changed and if it's already used
    if (name && name !== supplier.name) {
      const existingName = await Supplier.findOne({ name });
      if (existingName) {
        return res.status(400).json({ message: "Supplier with this name already exists" });
      }
    }

    if (file) {
      // Delete old image if exists
      if (supplier.imageUrl) {
        const oldFilePath = path.join(SUPPLIER_DIR, path.basename(supplier.imageUrl));
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
      supplier.imageUrl = `/uploads/suppliers/${file.filename}`;
    }

    if (name) supplier.name = name;
    if (description !== undefined) supplier.description = description;

    await supplier.save();

    res.status(200).json({ message: "Supplier updated", supplier });
  } catch (error) {
    res.status(500).json({ message: "Error updating supplier", error: error.message });
  }
};

// Delete supplier
export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Delete image if exists
    if (supplier.imageUrl) {
      const filePath = path.join(SUPPLIER_DIR, path.basename(supplier.imageUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await supplier.deleteOne();

    res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting supplier", error: error.message });
  }
};
