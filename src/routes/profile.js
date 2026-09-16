const express = require('express');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');
const { uploadSingle } = require('../upload');

const router = express.Router();

router.get('/:id', requireAuth, profileController.getProfile);
router.put('/me', requireAuth, profileController.updateProfile);
router.post('/me/photo', requireAuth, uploadSingle('photo'), profileController.uploadPhoto);
router.delete('/me/photo', requireAuth, profileController.deletePhoto);

module.exports = router;
