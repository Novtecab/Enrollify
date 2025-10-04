const express = require('express');
const router = express.Router();

// Placeholder routes for applications
router.get('/', (req, res) => {
  res.status(200).json({ success: true, applications: [] });
});

module.exports = router;