const mongoose = require("mongoose");
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected Successfully");

    const User = require("./models/User");
    const Employee = require("./models/Employee");
    const Activity = require("./models/Activity");

    // Check all users
    const users = await User.find({});
    console.log("\nUsers:");
    users.forEach((user, index) => {
      console.log(
        `${index + 1}. Email: ${user.email}, Company: ${user.companyName}`
      );
    });

    // Check all employees
    const employees = await Employee.find({});
    console.log("\nEmployees:");
    employees.forEach((emp, index) => {
      console.log(
        `${index + 1}. Name: ${emp.name}, Company: ${emp.companyName}`
      );
    });

    // Check activities for each company
    const companies = [
      ...new Set([
        ...users.map((u) => u.companyName),
        ...employees.map((e) => e.companyName),
      ]),
    ];
    console.log("\nCompanies found:", companies);

    for (const company of companies) {
      const activities = await Activity.find({ companyName: company });
      console.log(`\nActivities for ${company}: ${activities.length}`);
    }

    process.exit(0);
  })
  .catch((err) => {
    console.log("MongoDB Connection error", err);
    process.exit(1);
  });
