const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/add', authMiddleware, projectController.createProject);           // ✅ add project         
router.get('/:projectId', authMiddleware, projectController.getProjectById);    // ✅ get project by ID
router.get('/', authMiddleware, projectController.getAllProjects);              // ✅ get all projects
router.put('/:projectId', authMiddleware, projectController.updateProject);     // ✅ update project
router.delete('/:projectId', authMiddleware, projectController.deleteProject);  // ✅ delete project


module.exports = router;