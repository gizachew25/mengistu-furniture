'use strict';

const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/inquiryController');
const { handleValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { formLimiter } = require('../middleware/rateLimiters');

const createValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Your name is required.'),
  body('phone').optional({ values: 'falsy' }).isLength({ max: 40 }),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('subject').trim().isLength({ min: 2, max: 160 }).withMessage('A subject is required.'),
  body('message').trim().isLength({ min: 5, max: 4000 }).withMessage('Please write your message.'),
];

// ── Public router ────────────────────────────────────────────
const publicRouter = express.Router();
publicRouter.post('/', formLimiter, createValidators, handleValidation, ctrl.create);

// ── Admin router ─────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireAuth);
adminRouter.get('/', ctrl.list);
adminRouter.put('/:id', [body('status').notEmpty()], handleValidation, ctrl.updateStatus);
adminRouter.delete('/:id', ctrl.remove);

module.exports = { publicRouter, adminRouter };
