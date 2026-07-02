const express = require('express'); 
const router = express.Router(); 

// Import controller handlers from the bill controller module
const { 
    createSmartBill, 
    getGroupLedger, 
    clearSharePayment, 
    clearPaidHistory, 
    getOutstandingPayments,
    clearBulkPayments
} = require('../controllers/billController');

//@ Route: /api/bills
router.post('/split_smart', createSmartBill); //Process a smart split bill
router.get('/ledger/:groupId', getGroupLedger); //Retrieve the complete breakdown history and settlement states for a group
router.post('/settle-share', clearSharePayment); //Mark a specific individual debt share row as completely 'paid'
router.post('/clear-history', clearPaidHistory); //Wipe out or delete all settled 'paid' history logs for a specific group
router.get('/outstanding/:userId', getOutstandingPayments); //Fetch all pending 'unpaid' debts across all groups for a specific user
router.post('/settle-bulk', clearBulkPayments);

// Export the router module to be mounted in the main server routing lifecycle
module.exports = router; 


