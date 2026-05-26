const express = require('express');
const router = express.Router();
const { 
  getAccounts, 
  createAccount, 
  updateAccount, 
  deleteAccount 
} = require('../controllers/userController');

// Define HTTP endpoints
router.get('/', getAccounts);         // READ
router.post('/', createAccount);       // CREATE
router.put('/:id', updateAccount);     // UPDATE
router.delete('/:id', deleteAccount);  // DELETE

module.exports = router;