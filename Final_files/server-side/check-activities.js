const mongoose = require("mongoose");
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected Successfully");

    const Activity = require("./models/Activity");

    // Check activities without companyName
    const activitiesWithoutCompany = await Activity.find({
      companyName: { $exists: false },
    });
    console.log(
      "Activities without companyName:",
      activitiesWithoutCompany.length
    );

    // Check all activities
    const allActivities = await Activity.find({});
    console.log("Total activities:", allActivities.length);

    // Show first few activities
    console.log("\nFirst 3 activities:");
    allActivities.slice(0, 3).forEach((activity, index) => {
      console.log(
        `${index + 1}. ID: ${activity._id}, Type: ${activity.type}, Company: ${
          activity.companyName || "MISSING"
        }`
      );
    });

    if (activitiesWithoutCompany.length > 0) {
      console.log("\nFound activities without companyName, updating...");
      const User = require("./models/User");
      const users = await User.find({});

      if (users.length > 0) {
        for (const activity of activitiesWithoutCompany) {
          activity.companyName = users[0].companyName;
          await activity.save();
          console.log(
            `Updated activity ${activity._id} with companyName: ${users[0].companyName}`
          );
        }
        console.log("All activities updated successfully!");
      }
    }

    process.exit(0);
  })
  .catch((err) => {
    console.log("MongoDB Connection error", err);
    process.exit(1);
  });
