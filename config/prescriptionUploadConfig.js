import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Uploads directory path
const UPLOADS_DIR = path.join(__dirname, "../uploads");
const PRESCRIPTIONS_DIR = path.join(UPLOADS_DIR, "prescriptions");

// Ensure uploads and prescriptions directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(PRESCRIPTIONS_DIR)) {
    fs.mkdirSync(PRESCRIPTIONS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, PRESCRIPTIONS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to allow only images and PDFs
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PNG, JPG, and PDF files are allowed.'), false);
    }
};

export const uploads = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
