const mongoose = require('mongoose');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Team = require('./models/Team');
const Activity = require('./models/Activity');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/project_management_tool', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const migrateData = async () => {
  try {
    console.log('Starting migration...');

    // Get all users to map their company names
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    // Update Projects - assign companyName based on the user who created them
    const projects = await Project.find({ companyName: { $exists: false } });
    console.log(`Found ${projects.length} projects without companyName`);
    
    for (const project of projects) {
      // For now, assign to the first user's company (you may need to adjust this logic)
      if (users.length > 0) {
        project.companyName = users[0].companyName;
        await project.save();
        console.log(`Updated project ${project.project_id} with companyName: ${users[0].companyName}`);
      }
    }

    // Update Tasks - assign companyName based on the user who created them
    const tasks = await Task.find({ companyName: { $exists: false } });
    console.log(`Found ${tasks.length} tasks without companyName`);
    
    for (const task of tasks) {
      // For now, assign to the first user's company (you may need to adjust this logic)
      if (users.length > 0) {
        task.companyName = users[0].companyName;
        await task.save();
        console.log(`Updated task ${task.task_id} with companyName: ${users[0].companyName}`);
      }
    }

    // Update Teams - assign companyName based on the user who created them
    const teams = await Team.find({ companyName: { $exists: false } });
    console.log(`Found ${teams.length} teams without companyName`);
    
    for (const team of teams) {
      // For now, assign to the first user's company (you may need to adjust this logic)
      if (users.length > 0) {
        team.companyName = users[0].companyName;
        await team.save();
        console.log(`Updated team ${team.teamName} with companyName: ${users[0].companyName}`);
      }
    }

    // Update Activities - assign companyName based on the user who created them
    const activities = await Activity.find({ companyName: { $exists: false } });
    console.log(`Found ${activities.length} activities without companyName`);
    
    for (const activity of activities) {
      // For now, assign to the first user's company (you may need to adjust this logic)
      if (users.length > 0) {
        activity.companyName = users[0].companyName;
        await activity.save();
        console.log(`Updated activity ${activity._id} with companyName: ${users[0].companyName}`);
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateData(); 