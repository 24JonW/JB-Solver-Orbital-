const express = require('express'); 
const router = express.Router(); 

const { createSmartBill, getGroupLedger, clearSharePayment } = require('../controllers/billController');

router.post('/split_smart', createSmartBill); 
router.get('/ledger/:groupId', getGroupLedger); 
router.post('/settle-share', clearSharePayment); 


module.exports = router; 


