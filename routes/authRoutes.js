const express = require('express');
const { loginParent } = require('../controllers/authController');

const router = express.Router();

router.post('/parents', loginParent);

module.exports = router;
