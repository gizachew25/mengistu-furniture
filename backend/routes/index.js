'use strict';

const express = require('express');

const authRoutes = require('./authRoutes');
const products = require('./productRoutes');
const appointments = require('./appointmentRoutes');
const inquiries = require('./inquiryRoutes');
const dashboard = require('./dashboardRoutes');
const productCtrl = require('../controllers/productController');
const appointmentCtrl = require('../controllers/appointmentController');
const inquiryCtrl = require('../controllers/inquiryController');
const config = require('../config/env');

const router = express.Router();

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Public metadata (enums used by the UI)
router.get('/meta/categories', productCtrl.categories);
router.get('/meta/enums', (req, res) =>
  res.json({
    categories: productCtrl._categories,
    appointmentStatuses: appointmentCtrl._statuses,
    inquiryStatuses: inquiryCtrl._statuses,
  })
);

// Auth
router.use('/auth', authRoutes);

// Public settings
router.get('/settings', dashboard.getPublicSettings);

// Public resources
router.use('/products', products.publicRouter);
router.use('/appointments', appointments.publicRouter);
router.use('/inquiries', inquiries.publicRouter);

// ── Protected admin namespace ────────────────────────────────
router.use('/admin/products', products.adminRouter);
router.use('/admin/appointments', appointments.adminRouter);
router.use('/admin/inquiries', inquiries.adminRouter);
router.use('/admin/dashboard', dashboard.adminRouter);
router.use('/admin/settings', dashboard.settingsAdminRouter);

module.exports = router;
