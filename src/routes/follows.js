const express = require('express');
const followsController = require('../controllers/followsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/requests', requireAuth, followsController.listRequests);
router.get('/:id/followers', requireAuth, followsController.listFollowers);
router.get('/:id/following', requireAuth, followsController.listFollowing);
router.post('/:id', requireAuth, followsController.follow);
router.patch('/:id', requireAuth, followsController.respond);
router.delete('/:id', requireAuth, followsController.unfollow);

module.exports = router;
