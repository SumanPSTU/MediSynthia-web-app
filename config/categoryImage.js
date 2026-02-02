import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directory path
const categoryUploadDir = path.join(__dirname, "../uploads/category");

// Ensure the directory exists
if (!fs.existsSync(categoryUploadDir)) {
  fs.mkdirSync(categoryUploadDir, { recursive: true }); // recursive ensures parent folders are created
}

// Store files in /uploads/category
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, categoryUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

export const uploadCategoryImage = multer({ storage, fileFilter });
