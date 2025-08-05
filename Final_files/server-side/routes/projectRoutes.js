const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");
const { addProjectPhase } = require("../controllers/projectController");
const { updatePhaseStatus } = require("../controllers/projectController");
const { updateSubtaskStatus } = require("../controllers/projectController");
const { editSubtask } = require("../controllers/projectController");
const { deleteSubtask } = require("../controllers/projectController");

router.post("/add", authMiddleware, projectController.createProject); // ✅ add project
router.get("/:projectId", authMiddleware, projectController.getProjectById); // ✅ get project by ID
router.get("/", authMiddleware, projectController.getAllProjects); // ✅ get all projects
router.put("/:projectId", authMiddleware, projectController.updateProject); // ✅ update project
router.delete("/:projectId", authMiddleware, projectController.deleteProject); // ✅ delete project
router.get(
  "/team-member/:teamMemberId/projects",
  authMiddleware,
  projectController.getProjectsByTeamMember
); // ✅ get projects by team member
router.post("/add-phase", authMiddleware, addProjectPhase); // ✅ add project phase
router.post("/update-phase-status", authMiddleware, updatePhaseStatus); // ✅ update phase status
router.get(
  "/phases/:projectId",
  authMiddleware,
  projectController.getProjectPhases
);
router.post(
  "/delete-phase",
  authMiddleware,
  projectController.deleteProjectPhase
);
router.post("/subtask/add", authMiddleware, projectController.addSubtask);
router.post(
  "/subtask/update-status",
  authMiddleware,
  projectController.updateSubtaskStatus
); // ✅ update subtask status
router.post("/subtask/edit", authMiddleware, projectController.editSubtask); // ✅ edit subtask
router.post("/subtask/delete", authMiddleware, projectController.deleteSubtask); // ✅ delete subtask
router.get(
  "/subtasks/:project_id",
  authMiddleware,
  projectController.getSubtasksByProjectId
);
router.get(
  "/subtask/activity/:subtaskId",
  authMiddleware,
  projectController.getSubtaskActivity
);

module.exports = router;
