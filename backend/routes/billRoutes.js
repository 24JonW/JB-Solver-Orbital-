const express = require('express'); 
const router = express.Router(); 

const { 
    createSmartBill, 
    getGroupLedger, 
    clearSharePayment, 
    clearPaidHistory, 
    getOutstandingPayments
} = require('../controllers/billController');

router.post('/split_smart', createSmartBill); 
router.get('/ledger/:groupId', getGroupLedger); 
router.post('/settle-share', clearSharePayment); 
router.post('/clear-history', clearPaidHistory); 
router.get('/outstanding/:userId', getOutstandingPayments); 

module.exports = router; 


