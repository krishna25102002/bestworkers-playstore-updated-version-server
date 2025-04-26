const express = require('express');
const { updateUser, changePin } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.put('/update', protect, updateUser);
router.put('/change-pin', protect, changePin);

module.exports = router;