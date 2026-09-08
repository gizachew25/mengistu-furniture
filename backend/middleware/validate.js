'use strict';

const { validationResult } = require('express-validator');

/**
 * Collects express-validator errors into a clean 422 response.
 * Place after a chain of validators on a route.
 */
function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = {};
  for (const e of result.array()) {
    // e.path is the field name in express-validator v7
    if (!errors[e.path]) errors[e.path] = e.msg;
  }
  return res.status(422).json({
    error: 'Please correct the highlighted fields.',
    fields: errors,
  });
}

module.exports = { handleValidation };
