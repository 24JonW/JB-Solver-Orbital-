//Create the controller logic: 
const db= require('../config/db'); 

const getAccounts= async (req, res)=> {
    try {
        const result= await db.query('SELECT * FROM account ORDER BY user_id ASC');
        res.json(result.rows); 
    } catch (err) {
        console.log(err);
        res.status(500).json({error: 'Database read error'});
    }
}

const createAccount = async (req, res) => {
    const {username, password, email}= req.body; 
    try {
        const queryText= `
            INSERT INTO account (username, password, email, created_on)
            VALUES ($1, $2, $3, NOW()) RETURNING *`;
        const result= await db.query(queryText, [username, password, email ]); 
        res.status(201).json(result.rows[0]);

    } catch(err) {
        console.log(err); 
        res.status(500).json(error= 'Database write error')
    }
}

const updateAccount= async (req, res) => {
    const {id}= req.params; 
    const {email}= req.body; 
    try {
        const queryText= 'UPDATE account SET email= $1 WHERE user_id= $2 RETURNING *';
        const result= await db.query(queryText, [email, id]); 
        if (result.rows.length === 0) {
            return res.status(404).json({error: 'Account not found'});
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Database update error'});
    }
}

const deleteAccount= async (req, res) => {
    const {id } = req.params; 
    try {
        const result= await db.query('DELETE FROM account WHERE user_id= $1', [id]);
        if (result.rows.length=== 0) {
            return res.status(404).json({error: 'Account not found'}); 
        } 
        res.json({message: 'Account deleted successfully', deleted: result.rows[0]});
    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Database delete error'});
    }
}

module.exports= {
    getAccounts, 
    createAccount, 
    updateAccount, 
    deleteAccount
}