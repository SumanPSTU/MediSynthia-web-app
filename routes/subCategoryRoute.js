import {
  addSubCategory,
  getAllSubCategories,
  getSubCategory,
  getSubCategoriesByCategory,
  updateSubCategory,
  deleteSubCategory
} from "../controllers/subCategoryController.js";
import { uploadCategoryImage } from "../config/categoryImage.js";

const router = express.Router();

router.post("/",uploadCategoryImage.single("image"), addSubCategory);
router.get("/", getAllSubCategories);
router.get("/:id", getSubCategory);
router.get("/by-category/:categoryId", getSubCategoriesByCategory);
router.put("/:id", uploadCategoryImage.single("image"), updateSubCategory);
router.delete("/:id", deleteSubCategory);

export default router;