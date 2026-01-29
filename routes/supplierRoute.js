import express from "express";
import { addSupplier, getSuppliers, getSupplierById, searchSuppliers, updateSupplier, deleteSupplier } from "../controllers/supplierController.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { adminAuthentication } from "../middleware/isAuthentication.js";

const router = express.Router();

// Ensure uploads/suppliers directory exists
const SUPPLIER_DIR = path.join(process.cwd(), "uploads/suppliers");
if (!fs.existsSync(SUPPLIER_DIR)) {
  fs.mkdirSync(SUPPLIER_DIR, { recursive: true });
}

// Multer configuration for supplier images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SUPPLIER_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Only images (jpeg, jpg, png, webp) are allowed"));
};

const uploadSupplierImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// Routes
router.post("/", uploadSupplierImage.single("image"),adminAuthentication, addSupplier);
router.get("/",adminAuthentication, getSuppliers);
router.get("/:id",adminAuthentication, getSupplierById);
router.get('/search/:q',adminAuthentication, searchSuppliers);
router.put("/:id", uploadSupplierImage.single("image"),adminAuthentication, updateSupplier);
router.delete("/:id",adminAuthentication, deleteSupplier);

export default router;
