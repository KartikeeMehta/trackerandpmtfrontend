const express = require("express");
const router = express.Router();
const teamController = require("../controllers/teamController");
const teamAuthMiddleware = require("../middleware/teamAuthMiddleware");
const employeeMiddleware = require("../middleware/employeeMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/createTeam", authMiddleware, teamController.createTeam);
router.delete("/deleteTeam", authMiddleware, teamController.deleteTeam);
router.put("/updateTeam", authMiddleware, teamController.updateTeam);
router.get("/team-leads", authMiddleware, teamController.getAllTeamLeads);
router.get("/team-members", authMiddleware, teamController.getAllTeamMembers);
router.get("/all-teams", authMiddleware, teamController.getAllTeams);

// no delete one

module.exports = router;
