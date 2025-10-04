const express = require('express');
const router = express.Router();

// Placeholder routes for messages
router.get('/', (req, res) => {
  res.status(200).json({ success: true, messages: [] });
});

module.exports = router;