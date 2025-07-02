const express = require('express');
const {
  createParent,
  getAllParents,
  getParentById,
  updateParent,
  deleteParent,
  getChildrenByParentNic,
} = require('../controllers/parentController');

const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', createParent);
router.get('/', getAllParents);

// ✅ THIS MUST COME BEFORE `/:id`
router.get('/children', authenticate, getChildrenByParentNic);

router.get('/:id', getParentById);
router.put('/:id', updateParent);
router.delete('/:id', deleteParent);

module.exports = router;
