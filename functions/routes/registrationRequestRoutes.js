const express = require('express');
const {
  createRequest,
  getAllRequests,
  getStartingMonths,
  setStartingMonths
} = require('../controllers/registrationRequestController');

const router = express.Router();

router.post('/', createRequest);
router.get('/', getAllRequests);
router.get('/starting-months', getStartingMonths);
router.put('/starting-months', setStartingMonths);

module.exports = router;
