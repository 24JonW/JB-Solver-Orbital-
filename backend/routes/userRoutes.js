const express = require('express');
const router = express.Router();
const { 
  getAccounts, 
  getSpecificAccount,
  createAccount, 
  updateAccount, 
  deleteAccount, 
  registerUser, 
  loginUser
} = require('../controllers/userController');

//@ Route: /api/accounts
// Define HTTP endpoints
router.get('/', getAccounts);         // READ retrieve user account
router.put('/:id', updateAccount);     // UPDATE update user account
router.get('/:id', getSpecificAccount); //READ selected account
router.post('/', createAccount);       // CREATE create user account

router.delete('/:id', deleteAccount);  // DELETE delete user account
router.post('/register', registerUser); // POST http://localhost:5432/api/accounts/register
router.post('/login', loginUser); //login
module.exports = router;