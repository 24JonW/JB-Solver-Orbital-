const express = require('express');
const router = express.Router();


const { 
    createNewGroup, 
    deleteGroup,
    leaveGroup,
    joinGroup, 
    getGroupList, 
    getMessage, 
    postMessage, 
    getGroupMembers
    
} = require('../controllers/communityGroupController');

// Define HTTP endpoints
router.post('/create', createNewGroup);
router.post('/delete', deleteGroup)
router.post('/join', joinGroup);
router.post('/leave', leaveGroup);
router.get('/user/:userId', getGroupList);
router.get('/:groupId/messages', getMessage); 
router.post('/message', postMessage);
router.get('/:groupId/members', getGroupMembers); 
module.exports= router; 
  