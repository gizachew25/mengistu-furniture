'use strict';

const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { handleValidation } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

const passwordRule = body('password')
  .isString()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters.');

const emailRule = body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail();

// First-run setup
router.get('/setup-status', ctrl.setupStatus);
router.post(
  '/setup',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Full name is required.'),
    emailRule,
    body('phone').optional({ values: 'falsy' }).isString(),
    passwordRule,
  ],
  handleValidation,
  ctrl.setup
);

// Session
router.post(
  '/login',
  authLimiter,
  [emailRule, body('password').notEmpty().withMessage('Password is required.')],
  handleValidation,
  ctrl.login
);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.me);
router.put(
  '/me',
  requireAuth,
  [
    body('name').optional({ values: 'falsy' }).trim().isLength({ min: 2 }),
    body('newPassword').optional({ values: 'falsy' }).isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
  ],
  handleValidation,
  ctrl.updateProfile
);

// Admin management (super_admin only)
router.get('/admins', requireAuth, requireRole('super_admin'), ctrl.listAdmins);
router.post(
  '/admins',
  requireAuth,
  requireRole('super_admin'),
  [
    body('name').trim().notEmpty().withMessage('Full name is required.'),
    emailRule,
    body('phone').optional({ values: 'falsy' }).isString(),
    passwordRule,
    body('role').optional().isIn(['admin', 'super_admin']),
  ],
  handleValidation,
  ctrl.createAdmin
);
router
  .route('/admins/:id/active')
  .put(requireAuth, requireRole('super_admin'), ctrl.setAdminActive)
  .patch(requireAuth, requireRole('super_admin'), ctrl.setAdminActive);

module.exports = router;
