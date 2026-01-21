import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Product images storage - save to uploads/products/
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const productDir = path.join(__dirname, "../uploads/products");
        cb(null, productDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const productFileFilter = (req, file, cb) => {
    const allowedExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExt.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files (.jpg, .jpeg, .png, .gif, .webp) are allowed"), false);
    }
};

// Export for product uploads
export const uploadProductImage = multer({
    storage: productStorage,
    fileFilter: productFileFilter
});

// Default export for backward compatibility
export const uploads = uploadProductImage;
