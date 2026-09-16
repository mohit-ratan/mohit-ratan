const express = require('express');
const storiesController = require('../controllers/storiesController');
const { requireAuth } = require('../middleware/auth');
const { uploadSingle } = require('../upload');

const router = express.Router();

router.get('/', requireAuth, storiesController.list);
router.post('/', requireAuth, uploadSingle('media'), storiesController.create);
router.post('/:id/view', requireAuth, storiesController.view);

module.exports = router;
