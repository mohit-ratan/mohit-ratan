const express = require('express');
const goalsController = require('../controllers/goalsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.patch('/:tag/subtasks/:index', requireAuth, goalsController.toggleSubtask);

module.exports = router;
