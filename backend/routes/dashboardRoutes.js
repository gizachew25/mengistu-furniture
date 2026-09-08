'use strict';

const express = require('express');
const ctrl = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

// ── Admin dashboard router ───────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireAuth);
adminRouter.get('/statistics', ctrl.statistics);
adminRouter.get('/activity', ctrl.recentActivity);

// ── Admin settings router ────────────────────────────────────
const settingsAdminRouter = express.Router();
settingsAdminRouter.use(requireAuth);
settingsAdminRouter.get('/', ctrl.getAdminSettings);
settingsAdminRouter.put('/', ctrl.updateSettings);

module.exports = { adminRouter, settingsAdminRouter, getPublicSettings: ctrl.getPublicSettings };
