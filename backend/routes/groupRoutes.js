const express = require('express');
const router = express.Router();

// Import controller handlers from the community group controller module
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
//@ Route: /api/groups
// Define HTTP endpoints
router.post('/create', createNewGroup); //Create a new community split-bill group
router.post('/delete', deleteGroup); //Delete an entire community group
router.post('/join', joinGroup); //Join an existing group using its verification code
router.post('/leave', leaveGroup); //Leave a community group
router.get('/user/:userId', getGroupList); //Retrieve all community groups that a specific user belongs to
router.get('/:groupId/messages', getMessage); //Fetch the chat message history for a specific group room
router.post('/message', postMessage); //Post a new chat message or bill summary text block to a group
router.get('/:groupId/members', getGroupMembers); //Get a list of all profile members participating in a specific group

// Export the router module to be mounted in the main server app entry point
module.exports= router; 
  