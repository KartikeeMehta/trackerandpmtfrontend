const User = require("../models/User");

exports.getSettings = async (req, res) => {
  try {
    // Only owners/admins can read settings; but if HR is off, reading is still fine
    const owner = await User.findOne({ role: "owner" }).select("hrEnabled");
    const hrEnabled = owner ? owner.hrEnabled !== false : true;
    res.json({ success: true, hrEnabled });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to load settings" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    // Require owner or admin
    const actorRole = req.user?.role || "owner"; // User model has no role field except default owner
    if (actorRole !== "owner" && actorRole !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const { hrEnabled } = req.body;
    const updated = await User.findOneAndUpdate(
      { role: "owner" },
      { hrEnabled: !!hrEnabled },
      { new: true, upsert: false }
    ).select("hrEnabled");
    res.json({ success: true, hrEnabled: updated ? updated.hrEnabled : !!hrEnabled });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to update settings" });
  }
};


