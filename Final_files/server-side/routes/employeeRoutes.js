const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const employeeController = require("../controllers/EmployeeController");

router.post("/addEmployee", authMiddleware, employeeController.addEmployee);
router.post("/employeeFirstLogin", employeeController.employeeFirstLogin);
router.put(
  "/editEmployee/:teamMemberId",
  authMiddleware,
  employeeController.editEmployee
);
router.delete(
  "/deleteEmployee/:teamMemberId",
  authMiddleware,
  employeeController.deleteEmployee
);
router.get("/all", authMiddleware, employeeController.getAllEmployees);
router.get("/team-leads", authMiddleware, employeeController.getAllTeamLeads);
router.get("/admins", authMiddleware, employeeController.getAllAdmins);
router.get("/managers", authMiddleware, employeeController.getAllManagers);
router.get(
  "/team-members",
  authMiddleware,
  employeeController.getAllTeamMembers
);
router.get("/roles", authMiddleware, employeeController.getAllRoles);

// General subtasks (admins/managers)
router.get(
  "/general-subtasks/:teamMemberId",
  authMiddleware,
  employeeController.getGeneralSubtasks
);
router.post(
  "/general-subtasks/update-status",
  authMiddleware,
  employeeController.updateGeneralSubtaskStatus
);
router.post(
  "/general-subtasks/delete",
  authMiddleware,
  employeeController.deleteGeneralSubtask
);

module.exports = router;
