import { BannerAdd } from "../models/bannerAddModel.js";
import fs from "fs";
import path from "path";

export const setAdd = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required",
      });
    }

    const { addId, addDescription, addNumber } = req.body;

    // Validate required fields
    if (!addId) {
      return res.status(400).json({
        success: false,
        message: "Banner ID (addId) is required",
      });
    }

    if (!addNumber) {
      return res.status(400).json({
        success: false,
        message: "Banner number (addNumber) is required",
      });
    }

    const imageUrl = `/uploads/carousel/${file.filename}`;

    const newAdd = await BannerAdd.create({
      addId,
      addDescription,
      addImgUrl: imageUrl,
      addNumber
    });

    res.status(201).json({
      success: true,
      message: "Banner added successfully",
      newAdd,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding banner",
      error: error.message,
    });
  }
};

export const getAdds = async (req, res) => {
  try {
    const { bannerNumber } = req.query;
    if (!bannerNumber) {
      return res.status(400).json({
        success: false,
        message: "Banner number is required"
      });
    }

    const limit = 5;
    const skip = (bannerNumber - 1) * limit;

    const banners = await BannerAdd.find()
      .skip(skip)
      .limit(limit);

    if (!banners || banners.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No banner ads found for this banner"
      });
    }

    res.status(200).json({
      success: true,
      message: "Banner ads retrieved successfully",
      banners,
      count: banners.length,
      bannerNumber: Number(bannerNumber)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const updateAdd = async (req, res) => {
  try {
    const { id } = req.params;

    const file = req.file;
    let imageUrl;

    // Find existing banner
    const existingAdd = await BannerAdd.findById(id);
    if (!existingAdd) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }

    if (file) {
      // Delete old image if it exists
      if (existingAdd.addImgUrl) {
        try {
          // Extract filename from URL path (remove leading /)
          const oldImagePath = path.join(process.cwd(), existingAdd.addImgUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (err) {
          console.error("Error deleting old image:", err);
          // Don't fail the update if old image deletion fails
        }
      }
      imageUrl = `/uploads/carousel/${file.filename}`;
    }

    const { addId, addDescription, addNumber, activeStatus } = req.body;

    // Validate required fields if they're being updated
    if (addNumber !== undefined && !addNumber) {
      return res.status(400).json({
        success: false,
        message: "Banner number (addNumber) cannot be empty"
      });
    }

    if (addId !== undefined && !addId) {
      return res.status(400).json({
        success: false,
        message: "Banner ID (addId) cannot be empty"
      });
    }

    // Update document
    const updatedAdd = await BannerAdd.findByIdAndUpdate(
      id,
      {
        ...(addId && { addId }),
        ...(addDescription !== undefined && { addDescription }),
        ...(addNumber && { addNumber }),
        ...(typeof activeStatus !== "undefined" && { activeStatus }),
        ...(imageUrl && { addImgUrl: imageUrl })
      },
      { new: true } // return updated doc
    );

    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      updatedAdd
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating banner",
      error: error.message
    });
  }
};

export const deleteAdd = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAdd = await BannerAdd.findByIdAndDelete(id);

    if (!deletedAdd) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }

    // Delete the image file from disk
    if (deletedAdd.addImgUrl) {
      try {
        const imagePath = path.join(process.cwd(), deletedAdd.addImgUrl);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.error("Error deleting image file:", err);
        // Don't fail the deletion if image cleanup fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Banner deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting banner",
      error: error.message
    });
  }
};

export const toggleActiveStatus = async (req, res) => {
  try {

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "addId is required"
      });
    }

    const bannerAdd = await BannerAdd.findById(id);
    if (!bannerAdd) {
      return res.status(404).json({
        success: false,
        message: "Banner not found"
      });
    }

    // Toggle the status
    bannerAdd.activeStatus = !bannerAdd.activeStatus;
    await bannerAdd.save();

    res.status(200).json({
      success: true,
      message: `Banner activeStatus toggled to ${bannerAdd.activeStatus}`,
      banner: bannerAdd
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

export const getAllBanners = async (req, res) => {
  try {
    const banners = await BannerAdd.find();
    res.status(200).json({
      success: true,
      message: "All banners retrieved successfully",
      banners,
      count: banners.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving banners",
      error: error.message
    });
  }
};