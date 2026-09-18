const express = require('express');
const usersController = require('../controllers/usersController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/search', requireAuth, usersController.search);

module.exports = router;
