const express = require('express');
const router = express.Router();

// Placeholder routes for admin
router.get('/stats', (req, res) => {
  res.status(200).json({ success: true, stats: {} });
});

module.exports = router;