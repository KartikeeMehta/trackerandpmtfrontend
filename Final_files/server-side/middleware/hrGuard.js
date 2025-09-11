const User = require("../models/User");

// Guards HR-related features when company owner has disabled them
module.exports = async function hrGuard(req, res, next) {
  try {
    // Read flag from owner document; if no owner found, default to true
    const owner = await User.findOne({ role: "owner" }).select("hrEnabled");
    const enabled = owner ? owner.hrEnabled !== false : true;
    if (!enabled) {
      return res
        .status(503)
        .json({ success: false, message: "HR management system is disabled" });
    }
    next();
  } catch (e) {
    return res
      .status(503)
      .json({ success: false, message: "HR management system is disabled" });
  }
};


