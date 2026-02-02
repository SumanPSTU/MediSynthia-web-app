import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carousel images storage - save to uploads/carousel/
const carouselStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const carouselDir = path.join(__dirname, "../uploads/carousel");

    // Create folder if not exists
    if (!fs.existsSync(carouselDir)) {
      fs.mkdirSync(carouselDir, { recursive: true });
    }

    cb(null, carouselDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const carouselFileFilter = (req, file, cb) => {
  const allowedExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (.jpg, .jpeg, .png, .gif, .webp) are allowed"), false);
  }
};

// Export for carousel uploads
export const uploadCarouselImage = multer({
  storage: carouselStorage,
  fileFilter: carouselFileFilter
});
