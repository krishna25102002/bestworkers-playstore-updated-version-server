const express = require("express");
const router = express.Router();
const { addProfession, getProfessionalsByService, updateUserProfessionalProfile } = require("../controllers/professionController");
const { protect } = require('../middlewares/authMiddleware'); // Import the protect middleware

router.post('/', protect, addProfession); // Apply protect middleware here
router.get('/', getProfessionalsByService);
router.put('/me', protect, updateUserProfessionalProfile); // if base path is /api/professions




module.exports = router;
