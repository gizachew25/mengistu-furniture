'use strict';

const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/appointmentController');
const { handleValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { appointmentUpload } = require('../middleware/upload');
const { formLimiter } = require('../middleware/rateLimiters');

const createValidators = [
  body('customer_name').trim().isLength({ min: 2, max: 120 }).withMessage('Your full name is required.'),
  body('phone').trim().isLength({ min: 7, max: 40 }).withMessage('A valid phone number is required.'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('furniture_type').trim().isLength({ min: 2, max: 120 }).withMessage('Please choose a furniture type.'),
  body('preferred_date').isISO8601().withMessage('Choose a preferred date.'),
  body('preferred_time').optional({ values: 'falsy' }).isString(),
  body('description').optional({ values: 'falsy' }).isLength({ max: 3000 }),
  body('notes').optional({ values: 'falsy' }).isLength({ max: 2000 }),
];

// ── Public router ────────────────────────────────────────────
const publicRouter = express.Router();
publicRouter.post(
  '/',
  formLimiter,
  appointmentUpload.single('reference_image'),
  createValidators,
  handleValidation,
  ctrl.create
);
publicRouter.get('/track/:reference', ctrl.track);

// ── Admin router ─────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireAuth);
adminRouter.get('/', ctrl.list);
adminRouter.get('/:id', ctrl.get);
adminRouter.put('/:id/status', [body('status').notEmpty()], handleValidation, ctrl.updateStatus);
adminRouter.put('/:id/note', ctrl.updateNote);

module.exports = { publicRouter, adminRouter };
