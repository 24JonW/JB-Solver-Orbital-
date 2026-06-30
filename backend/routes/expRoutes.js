const express = require('express');
const router = express.Router();
const { 
    getPersonalLedger, 
    createPersonalExpense, 
    deleteTransactionRecord, 
    setMonthlyBudget, 
    getMonthlyBudget 
} = require('../controllers/expenditureController'); 

// Transaction Routes
router.post('/transaction', createPersonalExpense); 
router.get('/transaction/:userId', getPersonalLedger); 
router.delete('/transaction/:billId', deleteTransactionRecord); 

// Budget Routes (Now matched to /api/exp based on your frontend setup)
router.post('/budget', setMonthlyBudget);
router.get('/budget/:userId/:monthStr', getMonthlyBudget);

module.exports = router;



