'use strict';

const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/productController');
const { handleValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { productUpload } = require('../middleware/upload');

const CATEGORIES = ctrl._categories;

const productValidators = [
  body('name').trim().isLength({ min: 2, max: 160 }).withMessage('Product name is required.'),
  body('category').optional().isIn(CATEGORIES).withMessage('Choose a valid category.'),
  body('price').isFloat({ min: 0 }).withMessage('Enter a valid price.'),
  body('discount_price')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a positive number.'),
  body('description').optional({ values: 'falsy' }).isLength({ max: 4000 }),
];

// ── Public router ────────────────────────────────────────────
const publicRouter = express.Router();
publicRouter.get('/', ctrl.listPublic);
publicRouter.get('/:id', ctrl.getPublic);

// ── Admin router (mounted under /api/admin/products, all protected) ──
const adminRouter = express.Router();
adminRouter.use(requireAuth);

adminRouter.get('/', ctrl.listAdmin);
adminRouter.get('/:id', ctrl.getAdmin);
adminRouter.post('/', productUpload.array('images', 8), productValidators, handleValidation, ctrl.create);
adminRouter.put('/:id', productUpload.array('images', 8), productValidators, handleValidation, ctrl.update);
adminRouter.patch('/:id/publish', ctrl.togglePublish);
adminRouter.delete('/:id', ctrl.remove);

adminRouter.post('/:id/images', productUpload.array('images', 8), ctrl.addImages);
adminRouter.patch('/:id/images/:imageId/primary', ctrl.setPrimaryImage);
adminRouter.delete('/:id/images/:imageId', ctrl.removeImage);

module.exports = { publicRouter, adminRouter };
