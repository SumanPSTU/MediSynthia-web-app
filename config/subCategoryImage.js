import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SubCategory images storage - save to uploads/subCategory/
const subCategoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subCategoryDir = path.join(__dirname, "../uploads/subCategory");
    cb(null, subCategoryDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const subCategoryFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

export const uploadSubCategoryImage = multer({ 
  storage: subCategoryStorage, 
  fileFilter: subCategoryFileFilter 
});

