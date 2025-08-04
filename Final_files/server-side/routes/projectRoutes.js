const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');
const { addProjectPhase } = require('../controllers/projectController');

router.post('/add', authMiddleware, projectController.createProject);           // ✅ add project         
router.get('/:projectId', authMiddleware, projectController.getProjectById);    // ✅ get project by ID
router.get('/', authMiddleware, projectController.getAllProjects);              // ✅ get all projects
router.put('/:projectId', authMiddleware, projectController.updateProject);     // ✅ update project
router.delete('/:projectId', authMiddleware, projectController.deleteProject);  // ✅ delete project
router.get("/team-member/:teamMemberId/projects", authMiddleware, projectController.getProjectsByTeamMember); // ✅ get projects by team member
router.post('/add-phase', authMiddleware, addProjectPhase); // ✅ add project phase

module.exports = router;