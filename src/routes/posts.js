const express = require('express');
const postsController = require('../controllers/postsController');
const { requireAuth } = require('../middleware/auth');
const { uploadSingle } = require('../upload');

const router = express.Router();

router.get('/', requireAuth, postsController.list);
router.get('/trending-tags', requireAuth, postsController.trendingTags);
router.get('/category-counts', requireAuth, postsController.categoryCounts);
router.get('/achievements', requireAuth, postsController.achievements);
router.post('/', requireAuth, uploadSingle('media'), postsController.create);
router.put('/:id', requireAuth, postsController.update);
router.delete('/:id', requireAuth, postsController.remove);
router.post('/:id/like', requireAuth, postsController.like);
router.get('/:id/comments', requireAuth, postsController.listComments);
router.post('/:id/comments', requireAuth, postsController.addComment);

module.exports = router;
