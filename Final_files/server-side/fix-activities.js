const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected Successfully');
    
    const User = require('./models/User');
    const Employee = require('./models/Employee');
    const Activity = require('./models/Activity');
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    // Get all activities
    const activities = await Activity.find({});
    console.log(`Found ${activities.length} activities`);
    
    // Distribute activities to users based on their creation time or randomly
    // For now, let's assign activities to the first user (Webblaze Softech)
    // and create some activities for other users
    
    const firstUser = users[0]; // Webblaze Softech
    const otherUsers = users.slice(1); // Other companies
    
    console.log(`\nDistributing activities...`);
    console.log(`First user (${firstUser.companyName}): ${firstUser.email}`);
    
    // Create some sample activities for other users
    for (const user of otherUsers) {
      console.log(`Creating activities for ${user.companyName} (${user.email})`);
      
      // Create some sample activities for each company
      const sampleActivities = [
        {
          type: "Employee",
          action: "add",
          name: "Sample Employee",
          description: `Added new employee for ${user.companyName}`,
          performedBy: user.firstName + " " + user.lastName,
          companyName: user.companyName,
          timestamp: new Date()
        },
        {
          type: "Project",
          action: "add", 
          name: "Sample Project",
          description: `Created project for ${user.companyName}`,
          performedBy: user.firstName + " " + user.lastName,
          companyName: user.companyName,
          timestamp: new Date()
        }
      ];
      
      for (const activityData of sampleActivities) {
        const activity = new Activity(activityData);
        await activity.save();
        console.log(`Created activity for ${user.companyName}`);
      }
    }
    
    console.log('\nActivity distribution completed!');
    
    // Show final count
    for (const user of users) {
      const count = await Activity.countDocuments({ companyName: user.companyName });
      console.log(`${user.companyName}: ${count} activities`);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.log('MongoDB Connection error', err);
    process.exit(1);
  }); 