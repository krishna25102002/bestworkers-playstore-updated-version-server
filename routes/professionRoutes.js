const express = require("express");
const router = express.Router();
const { addProfession, getProfessionalsByService } = require("../controllers/professionController");

router.post('/',addProfession);
router.get('/', getProfessionalsByService);



module.exports = router;
