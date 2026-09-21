const express = require('express');
const accountabilityController = require('../controllers/accountabilityController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/requests', requireAuth, accountabilityController.listRequests);
router.get('/', requireAuth, accountabilityController.listMine);
router.post('/:id', requireAuth, accountabilityController.request);
router.patch('/:id', requireAuth, accountabilityController.respond);
router.delete('/:id', requireAuth, accountabilityController.unpair);

module.exports = router;
