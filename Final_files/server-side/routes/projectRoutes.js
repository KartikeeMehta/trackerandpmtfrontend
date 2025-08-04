const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');
const { addProjectPhase } = require('../controllers/projectController');
const { updatePhaseStatus } = require('../controllers/projectController');

router.post('/add', authMiddleware, projectController.createProject);           // ✅ add project         
router.get('/:projectId', authMiddleware, projectController.getProjectById);    // ✅ get project by ID
router.get('/', authMiddleware, projectController.getAllProjects);              // ✅ get all projects
router.put('/:projectId', authMiddleware, projectController.updateProject);     // ✅ update project
router.delete('/:projectId', authMiddleware, projectController.deleteProject);  // ✅ delete project
router.get("/team-member/:teamMemberId/projects", authMiddleware, projectController.getProjectsByTeamMember); // ✅ get projects by team member
router.post('/add-phase', authMiddleware, addProjectPhase); // ✅ add project phase
router.post('/update-phase-status', authMiddleware, updatePhaseStatus); // ✅ update phase status
router.post('/delete-phase', authMiddleware, projectController.deleteProjectPhase);

module.exports = router;