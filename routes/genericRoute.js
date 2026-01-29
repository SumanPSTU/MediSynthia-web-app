import express from "express";
import { addGeneric, getGenerics, getGenericById, searchGenerics, updateGeneric, deleteGeneric } from "../controllers/genericController.js";
import { adminAuthentication } from "../middleware/isAuthentication.js";

const router = express.Router();

router.post("/", adminAuthentication, addGeneric);
router.get("/", getGenerics);
router.get('/get-generics',adminAuthentication,getGenerics);
router.get("/:id", getGenericById);
router.get('/search/:q', searchGenerics);
router.put("/:id", adminAuthentication, updateGeneric);
router.delete("/:id", adminAuthentication, deleteGeneric);

export default router;
