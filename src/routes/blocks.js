const express = require('express');
const blocksController = require('../controllers/blocksController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, blocksController.listBlocked);
router.post('/:id', requireAuth, blocksController.block);
router.delete('/:id', requireAuth, blocksController.unblock);

module.exports = router;
