const express = require('express'); 
const router = express.Router(); 
console.log('in expRoutes');
const { getPersonalLedger } = require('../controllers/expenditureController');
router.get('/transaction/:userId', getPersonalLedger); 

module.exports = router;







