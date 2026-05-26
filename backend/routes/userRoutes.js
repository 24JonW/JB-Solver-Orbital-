const express = require('express');
const router = express.Router();
const { 
  getAccounts, 
  createAccount, 
  updateAccount, 
  deleteAccount, 
  registerUser, 
  loginUser
} = require('../controllers/userController');

// Define HTTP endpoints
router.get('/', getAccounts);         // READ
router.post('/', createAccount);       // CREATE
router.put('/:id', updateAccount);     // UPDATE
router.delete('/:id', deleteAccount);  // DELETE
router.post('/register', registerUser); // POST http://localhost:5432/api/accounts/register
router.post('/login', loginUser);
module.exports = router;