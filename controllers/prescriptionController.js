import { Prescription } from "../models/prescriptionModel.js";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure prescriptions directory exists
const PRESCRIPTION_DIR = path.join(UPLOADS_DIR, "prescriptions");
if (!fs.existsSync(PRESCRIPTION_DIR)) {
  fs.mkdirSync(PRESCRIPTION_DIR, { recursive: true });
}

export const uploadPrescription = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const data = req.body;
    const file = req.file;

    if (!data || !data.notes) {
      return res.status(400).json({
        success: false,
        message: "Notes field is required!",
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Prescription file is required.",
      });
    }

    const prescriptionUrl = `/uploads/prescriptions/${file.filename}`;

    const prescription = await Prescription.create({
      userId,
      notes: data.notes,
      prescriptionUrl,
    });

    res.status(201).json({
      success: true,
      message: "Prescription uploaded successfully!",
      prescription,
    });
  } catch (error) {
    console.error("Upload prescription error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update prescription (replace file & notes)
export const updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const file = req.file;

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    // Delete old file if new one is uploaded
    if (file && prescription.prescriptionUrl) {
      const oldFileName = path.basename(prescription.prescriptionUrl);
      const oldFilePath = path.join(PRESCRIPTION_DIR, oldFileName);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      prescription.prescriptionUrl = `/uploads/prescriptions/${file.filename}`;
    }

    if (data.notes) {
      prescription.notes = data.notes;
    }

    await prescription.save();

    res.status(200).json({
      success: true,
      message: "Prescription updated successfully!",
      prescription,
    });
  } catch (error) {
    console.error("Update prescription error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Delete prescription
export const deletePrescription = async (req, res) => {
  try {
    // Support both path params and query params
    const id = req.params.id || req.query.id;

    if (!id) {
      return res.status(400).json({ success: false, message: "Prescription ID is required" });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    // Delete file
    if (prescription.prescriptionUrl) {
      const fileName = path.basename(prescription.prescriptionUrl);
      const filePath = path.join(PRESCRIPTION_DIR, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prescription.deleteOne();

    res.status(200).json({
      success: true,
      message: "Prescription deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get all prescriptions with pagination (Admin only)
export const getAllPrescriptions = async (req, res) => {
  try {
    // page=1&limit=10
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const prescriptions = await Prescription.find()
      .populate("userId", "username email phone")
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit);

    const total = await Prescription.countDocuments();

    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      prescriptions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get prescriptions by user ID (Admin only)
export const getPrescriptionsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const prescriptions = await Prescription.find({ userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      prescriptions,
      count: prescriptions.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




// ✅ Get prescription by ID (for admin viewing details)
export const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "Prescription ID is required" });
    }

    const prescription = await Prescription.findById(id).populate('userId', 'username email phone profilePicture');
    
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    res.status(200).json({
      success: true,
      prescription,
    });
  } catch (error) {
    console.error("Get prescription by ID error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update prescription status (for admin)
export const updatePrescriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Prescription ID is required" });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    // Validate status value
    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}` 
      });
    }

    const prescription = await Prescription.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('userId', 'name email phone profilePicture');

    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    res.status(200).json({
      success: true,
      message: "Prescription status updated successfully",
      prescription,
    });
  } catch (error) {
    console.error("Update prescription status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete prescriptions on or before a specific date
export const deletePrescriptionsBeforeDate = async (req, res) => {
  try {
    const adminId = req.user._id; // authenticated admin
    const { date } = req.body; // e.g., "2025-09-01"

    if (!date) return res.status(400).json({ success: false, message: "Date is required." });

    const targetDate = new Date(date);
    targetDate.setHours(23, 59, 59, 999); // include entire day

    // Find prescriptions uploaded by admin on or before the date
    const prescriptions = await Prescription.find({
      uploadedBy: adminId, // assuming your prescription model has `uploadedBy` field
      createdAt: { $lte: targetDate },
    });

    // Delete files if exist
    prescriptions.forEach(prescription => {
      if (prescription.fileUrl) {
        const filePath = path.resolve(`uploads/${prescription.fileUrl}`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });

    // Delete prescription documents
    await Prescription.deleteMany({ _id: { $in: prescriptions.map(p => p._id) } });

    res.status(200).json({
      success: true,
      message: `${prescriptions.length} prescriptions on or before ${date} deleted successfully.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
