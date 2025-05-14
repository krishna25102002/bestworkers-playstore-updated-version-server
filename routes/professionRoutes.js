const express = require("express");
const router = express.Router();
const { addProfession, getProfessionalsByService } = require("../controllers/professionController");
const { protect } = require('../middlewares/authMiddleware'); // Import the protect middleware

router.post('/', protect, addProfession); // Apply protect middleware here
router.get('/', getProfessionalsByService);



module.exports = router;
