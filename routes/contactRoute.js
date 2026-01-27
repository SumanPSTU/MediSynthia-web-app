import express from "express";
import { adminAuthentication, userAuthentication } from "../middleware/isAuthentication.js";
import {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats,
} from "../controllers/contactController.js";

const router = express.Router();

// Protected route - User must be logged in to submit contact form
router.post("/contact", userAuthentication, createContact);

// Protected routes - Admin only
// IMPORTANT: More specific routes must come BEFORE generic routes
router.get("/contact/stats", adminAuthentication, getContactStats);
router.patch("/contact/:id/status", adminAuthentication, updateContactStatus);
router.delete("/contact/:id", adminAuthentication, deleteContact);
router.get("/contact/:id", adminAuthentication, getContactById);
router.get("/contact", adminAuthentication, getAllContacts);

export default router;

