const express = require('express'); 
const router = express.Router(); 
console.log('in expRoutes');
const { getPersonalLedger, createPersonalExpense, deleteTransactionRecord } = require('../controllers/expenditureController');
router.post('/transaction', createPersonalExpense); 
router.get('/transaction/:userId', getPersonalLedger); 
router.delete('/transaction/:billId', deleteTransactionRecord); 


module.exports = router;







