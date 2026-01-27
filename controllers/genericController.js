import { Generic } from "../models/genericModel.js";

// Add generic
export const addGeneric = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Generic name is required" });
    }

    const existing = await Generic.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Generic already exists" });
    }

    const generic = new Generic({
      name,
      description
    });

    await generic.save();

    res.status(201).json({ message: "Generic created", generic });
  } catch (error) {
    res.status(500).json({ message: "Error creating generic", error: error.message });
  }
};

// Get all generics
export const getGenerics = async (req, res) => {
  try {
    const generics = await Generic.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: generics.length,
      generics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching generics", error: error.message });
  }
};

// Get generic by ID
export const getGenericById = async (req, res) => {
  try {
    const { id } = req.params;
    const generic = await Generic.findById(id);

    if (!generic) {
      return res.status(404).json({ message: "Generic not found" });
    }

    res.status(200).json({ success: true, generic });
  } catch (error) {
    res.status(500).json({ message: "Error fetching generic", error: error.message });
  }
};

// Search generics
export const searchGenerics = async (req, res) => {
  try {
    const { q } = req.params;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const generics = await Generic.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } }
      ]
    }).limit(20);

    if (generics.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No generics found"
      });
    }

    res.status(200).json({
      success: true,
      generics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching generics",
      error: error.message
    });
  }
};

// Update generic
export const updateGeneric = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const generic = await Generic.findById(id);
    if (!generic) {
      return res.status(404).json({ message: "Generic not found" });
    }

    // Check if name is being changed and if it's already used
    if (name && name !== generic.name) {
      const existingName = await Generic.findOne({ name });
      if (existingName) {
        return res.status(400).json({ message: "Generic with this name already exists" });
      }
    }

    if (name) generic.name = name;
    if (description !== undefined) generic.description = description;

    await generic.save();

    res.status(200).json({ message: "Generic updated", generic });
  } catch (error) {
    res.status(500).json({ message: "Error updating generic", error: error.message });
  }
};

// Delete generic
export const deleteGeneric = async (req, res) => {
  try {
    const { id } = req.params;

    const generic = await Generic.findById(id);
    if (!generic) {
      return res.status(404).json({ message: "Generic not found" });
    }

    await generic.deleteOne();

    res.status(200).json({ message: "Generic deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting generic", error: error.message });
  }
};
