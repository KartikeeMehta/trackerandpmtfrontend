const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const employeeMiddleware = require("../middleware/employeeMiddleware");
const employeeController = require("../controllers/employeeController");

router.post("/addEmployee", authMiddleware, employeeController.addEmployee);
router.post("/employeeFirstLogin", employeeController.employeeFirstLogin);
router.put("/editEmployee/:teamMemberId",authMiddleware, employeeController.editEmployee);
router.delete("/deleteEmployee/:teamMemberId", authMiddleware, employeeController.deleteEmployee);
router.get("/all", authMiddleware, employeeController.getAllEmployees);
router.get("/team-leads", authMiddleware, employeeController.getAllTeamLeads);
router.get("/admins", authMiddleware, employeeController.getAllAdmins);
router.get("/team-members", authMiddleware, employeeController.getAllTeamMembers);

module.exports = router;