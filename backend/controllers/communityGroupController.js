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

const deleteGroup = async (req, res) => {
    const {groupId, userId}= req.body; 
    try {
        const checkGroup = await db.query(`SELECT * FROM community_groups WHERE group_id =$1`, [groupId]);
        
        if (checkGroup.rows.length ==0){
            return res.status(444).json({error: 'Group not found'});
        }
        const group= checkGroup.rows[0]; 
        // if (group.created_by != userId) {
        //     res.status(403).json({error: 'Unauthorized: Only the group creator can delete this room.'}); 
        // }
        await db.query('DELETE FROM group_messages WHERE group_id = $1', [groupId]);
        await db.query('DELETE FROM group_members WHERE group_id = $1', [groupId]);
        await db.query('DELETE FROM community_groups WHERE group_id = $1', [groupId]);
        res.status(200).json({ message: 'Group deleted successfully!' });


    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error deleting group chat.'});

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

const leaveGroup = async (req, res) => {
    const {groupId, userId}= req.body; 
    try {

        const membershipCheck = await db.query(
            `SELECT * FROM group_members WHERE group_id =$1 AND user_id = $2`, 
        [groupId, userId])

        if (membershipCheck.rows.length ==0) {
            return res.status(400).json({ error: 'You are not a member of this group.' });
        }
        await db.query(
            'DELETE FROM group_members WHERE user_id = $1 AND group_id = $2',
            [userId, groupId]
        );  
        const remainingCheck= await db.query('SELECT COUNT(*) FROM group_members WHERE user_id = $1', [groupId])
        const memberCount= parseInt(remainingCheck.rows[0].count);
        if (memberCount === 0) {
            await db.query('DELETE FROM group_messages WHERE group_id = $1', [groupId]);
            await db.query('DELETE FROM community_groups WHERE group_id = $1', [groupId]);
            return res.status(200).json({ message: 'Successfully left. Group was empty and has been deleted.' });
        }

        res.status(200).json({message: 'Successfully left the group'});

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error leaving group'});
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