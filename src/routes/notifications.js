const express = require('express');
const notificationsController = require('../controllers/notificationsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, notificationsController.list);
router.post('/read', requireAuth, notificationsController.markRead);

module.exports = router;
