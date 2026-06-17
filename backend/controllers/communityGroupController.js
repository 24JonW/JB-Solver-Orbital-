const db= require('../config/db'); 

//Create a new community group and automatically add the creator as the first member 
//Route: POST /api/groups/create
const createNewGroup= async (req, res)=> {
    const {groupName, userId}= req.body; 
    try {
        // Insert the new row into community_groups table
        const groupResult= await db.query(
            'INSERT INTO community_groups (group_name, created_by) VALUES ($1, $2) RETURNING *', 
            [groupName, userId]
        )
        const newGroup= groupResult.rows[0];
        // Automatically assign the creator to the group_members table 
        await db.query(
            'INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)', 
            [userId, newGroup.group_id]
        );
        res.status(201).json(newGroup);

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error creating group'});
    }
}

//Delete an entire community group along with all its associated messages and member records
//Route: POST /api/groups/delete
const deleteGroup = async (req, res) => {
    const {groupId, userId}= req.body; 
    try {
        // Verify that the requested group target actually exists
        const checkGroup = await db.query(`SELECT * FROM community_groups WHERE group_id =$1`, [groupId]);
        
        if (checkGroup.rows.length ==0){
            return res.status(444).json({error: 'Group not found'});
        }
        const group= checkGroup.rows[0]; 
        // NOTE: Optional security check constraint commented out below
        // if (group.created_by != userId) {
        //     res.status(403).json({error: 'Unauthorized: Only the group creator can delete this room.'}); 
        // }

        // Clear out all relational database records sequentially to satisfy foreign constraints
        await db.query('DELETE FROM group_messages WHERE group_id = $1', [groupId]);
        await db.query('DELETE FROM group_members WHERE group_id = $1', [groupId]);
        await db.query('DELETE FROM community_groups WHERE group_id = $1', [groupId]);
        res.status(200).json({ message: 'Group deleted successfully!' });


    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error deleting group chat.'});

    }

}


//Join an existing group using its ID and post a system message inside the room
//Route: POST /api/groups/join
const joinGroup= async (req, res) => {
    const {groupId, userId}= req.body; 
    try {
        //check if group exists
        const checkGroup= await db.query('SELECT * FROM community_groups WHERE group_id = $1', [groupId]); 
        if (checkGroup.rows.length == 0) {
            return res.status(444).json({error: 'Group ID not found'});
        }
        //Prevent duplicate entries into the group membership roster
        const checkMember= await db.query('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', 
            [groupId, userId]
        );
        if (checkMember.rows.length >0) {
            return res.status(400).json({error: 'You are already a member of this group'});
        }

        // Complete the enrollment insertion row
        await db.query ('INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)', 
            [userId, groupId]
        ); 
        //To add to the group messsage thread to indicate which user joins the group
        const userResult= await db.query('SELECT username FROM account WHERE user_id = $1', [userId]); 
        const username= userResult.rows[0]?.username || "A user"; 

        // System messages pass NULL as the sender_id
        await db.query (`INSERT INTO group_messages (group_id, sender_id, message_text) VALUES ($1, NULL, $2)`, 
            [groupId, `${username} joined the group`]
        );
        res.status(201).json({message: 'Joined successfully!', group: checkGroup.rows[0]}); 

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error joining group'});
    }

}

//Leave a group and trigger an automatic group self-destruct sweep if member count reaches zero
//Route: POST /api/groups/leave
const leaveGroup = async (req, res) => {
    const {groupId, userId}= req.body; 
    try {
        //Confirm the user is actually a verified member of the group
        const membershipCheck = await db.query(
            `SELECT * FROM group_members WHERE group_id =$1 AND user_id = $2`, 
        [groupId, userId])

        if (membershipCheck.rows.length ==0) {
            return res.status(400).json({ error: 'You are not a member of this group.' });
        }
        // Execute deletion from group_members table
        await db.query(
            'DELETE FROM group_members WHERE user_id = $1 AND group_id = $2',
            [userId, groupId]
        );  
        // Count remaining users left in the chat room room
        const remainingCheck= await db.query('SELECT COUNT(*) FROM group_members WHERE group_id = $1', [groupId])
        const memberCount= parseInt(remainingCheck.rows[0].count);
        //If group is has no members left, erase its relevant records completely from the database
        if (memberCount === 0) {
            await db.query('DELETE FROM group_messages WHERE group_id = $1', [groupId]);
            await db.query('DELETE FROM community_groups WHERE group_id = $1', [groupId]);
            return res.status(200).json({ message: 'Successfully left. Group was empty and has been deleted.' });
        }
        
        //If group is not empty, fetch username and push a system exit alert notification to notify remaining users
        const userResult= await db.query('SELECT username FROM account WHERE user_id = $1', [userId]); 
        const username= userResult.rows[0]?.username || "A user"; 

        await db.query (`INSERT INTO group_messages (group_id, sender_id, message_text) VALUES ($1, NULL, $2)`, 
            [groupId, `${username} left the group`]
        );

        res.status(200).json({message: 'Successfully left the group'});

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error leaving group'});
    }


}

//Fetch a list of all group chats a specific user belongs to
// Route: GET /api/groups/user/:userId
const getGroupList = async (req, res) => {
    const {userId}= req.params; 
    try {
        const groupList= await db.query(
            `SELECT * FROM community_groups JOIN group_members 
            ON community_groups.group_id= group_members.group_id
            WHERE group_members.user_id = $1`, 
            [userId]
        ); 
        res.json(groupList.rows);

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error fetching groups'});

    }
}

// Retrieve entire chronological message stream history for a specific room including authors usernames
// Route GET /api/groups/:groupId/messages
const getMessage= async (req, res) => {
    const {groupId}= req.params; 
    try {
        // Use LEFT JOIN so system notifications (sender_id = NULL) are preserved and not filtered out
        const result = await db.query(
            `SELECT group_messages.*, account.username FROM group_messages 
             LEFT JOIN account ON group_messages.sender_id = account.user_id 
             WHERE group_messages.group_id = $1 ORDER BY group_messages.sent_at ASC`,
            [groupId]
        );
        res.json(result.rows);

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error fetching group message'});

    }
}

// Post a textual string message payload into a specific community group chat room
// Route: POST /api/groups/message
const postMessage= async (req, res) => {
    const {groupId, senderId, messageText}= req.body; 
    try {
        const result = await db.query(
            'INSERT INTO group_messages (group_id, sender_id, message_text) VALUES ($1, $2, $3) RETURNING *', 
            [groupId, senderId, messageText]
        ); 
        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error sending message'});

    }
}

// Get a list of user profile entities for everyone registered inside a group
// Route: GET /api/groups/:groupId/members
const getGroupMembers = async (req, res) => {
    const {groupId} = req.params; 
    try {
        const result = await db.query(
            `SELECT account.user_id, account.username, account.email 
             FROM group_members 
             JOIN account ON group_members.user_id = account.user_id 
             WHERE group_members.group_id = $1 
             ORDER BY account.username ASC`,
            [groupId]
        );
        res.json(result.rows);

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error showing list of group members'}); 
    }
}

module.exports= {
    createNewGroup, 
    deleteGroup, 
    joinGroup, 
    leaveGroup, 
    getGroupList, 
    getMessage, 
    postMessage, 
    getGroupMembers
}