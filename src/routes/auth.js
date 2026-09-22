const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const { rateLimit } = require('../lib/authSecurity');
const router = express.Router();

router.post('/register', rateLimit('register', 5, 3600), authController.register);
router.get('/verify', authController.verify);
router.post('/login', rateLimit('login', 10, 900), authController.login);
router.post('/otp/request', rateLimit('otp/request', 3, 600), authController.requestOtp);
router.post('/otp/verify', rateLimit('otp/verify', 10, 600), authController.verifyOtp);
router.get('/me', requireAuth, authController.me);

router.post('/resend-verification', rateLimit('resend', 3, 600), authController.resendVerification);
router.post('/forgot-password', rateLimit('forgot', 3, 600), authController.forgotPassword);
router.post('/reset-password', rateLimit('reset', 5, 900), authController.resetPassword);
module.exports = router;
