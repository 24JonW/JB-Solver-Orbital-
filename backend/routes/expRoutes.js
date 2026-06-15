const express = require('express'); 
const router = express.Router(); 

const { getPersonalLedger } = require('../controllers/expenditureController');
router.get('/transaction/:userId', getPersonalLedger); 

module.exports = router;







