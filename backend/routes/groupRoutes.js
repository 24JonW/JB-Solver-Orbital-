const express = require('express');
const router = express.Router();


const { 
    createNewGroup, 
    joinGroup, 
    getGroupList, 
    getMessage, 
    postMessage, 
    getGroupMembers
    
} = require('../controllers/communityGroupController');

// Define HTTP endpoints
router.post('/create', createNewGroup);
router.post('/join', joinGroup);
router.get('/user/:userId', getGroupList);
router.get('/:groupId/messages', getMessage); 
router.post('/message', postMessage);
router.get('/:groupId/members', getGroupMembers); 
module.exports= router; 
  