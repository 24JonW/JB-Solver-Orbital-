const db= require('../config/db'); 

const createNewGroup= async (req, res)=> {
    const {groupName, userId}= req.body; 
    try {
        const groupResult= await db.query(
            'INSERT INTO community_groups (group_name, created_by) VALUES ($1, $2) RETURNING *', 
            [groupName, userId]
        )
        const newGroup= groupResult.rows[0]; 
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

const joinGroup= async (req, res) => {
    const {groupId, userId}= req.body; 
    try {
        //check if group exists
        const checkGroup= await db.query('SELECT * FROM community_groups WHERE group_id = $1', [groupId]); 
        if (checkGroup.rows.length == 0) {
            return res.status(444).json({error: 'Group ID not found'});
        }

        const checkMember= await db.query('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', 
            [groupId, userId]
        );
        if (checkMember.rows.length >0) {
            return res.status(400).json({error: 'You are already a member of this group'});
        }

        await db.query ('INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)', 
            [userId, groupId]
        ); 
        res.status(201).json({message: 'Joined successfully!', group: checkGroup.rows[0]}); 

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error joining group'});
    }

}
//Get all group chats a specific user belongs to
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
const getMessage= async (req, res) => {
    const {groupId}= req.params; 
    try {
        const result = await db.query(
            `SELECT group_messages.*, account.username FROM group_messages 
             JOIN account ON group_messages.sender_id = account.user_id 
             WHERE group_messages.group_id = $1 ORDER BY group_messages.sent_at ASC`,
            [groupId]
        );
        res.json(result.rows);

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error fetching group message'});

    }
}

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

module.exports= {
    createNewGroup, 
    joinGroup, 
    getGroupList, 
    getMessage, 
    postMessage
}