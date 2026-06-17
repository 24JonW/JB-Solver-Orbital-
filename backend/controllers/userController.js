//Create the controller logic: 
const db= require('../config/db'); 
const bcrypt= require('bcrypt'); 
const jwt= require('jsonwebtoken'); 

// Register new user, check for uniqueness, hash password, and save to DB
// Route: POST /api/accounts/register
const registerUser= async (req, res)=> {
    const {username, password, email}= req.body; 
    if (!username || !password || !email) {
        return res.status(400).json({error: 'Please enter all fields'}); 
    }
    try {
        //check if username or email already exists
        const userExist= await db.query('SELECT * FROM account WHERE username = $1 OR email= $2', [username, email]);
        if (userExist.rows.length >0) {
            return res.status(400).json({error: 'Username or email already registered'});
        }
        // Encrypt/Hash the password before saving to DB
        const saltRounds= 10; 
        const hashPassword= await bcrypt.hash(password, saltRounds);

        // Save the user account records safely returning sanitized credentials
        const queryText= `
            INSERT INTO account (username, password, email, created_on)
            VALUES ($1, $2, $3, NOW()) RETURNING user_id, username, email`;
        const result= await db.query(queryText, [username, hashPassword, email ]); 
        res.status(201).json({message: 'User registered successfully!', user: result.rows[0] });

    } catch (err) {
        console.log(err); 
        res.status(500).json({error: 'Registration failed'});
    }
}

// Authenticate user credentials, verify hash match, issue secure JWT, and update login history
// Route: POST /api/accounts/login
const loginUser= async (req, res)=> {
    const {username, password} = req.body;
    // Validate incoming data payloads
    if (!username || !password) {
        res.status(400).json({error: 'Please enter all fields'}); 

    }
    try {
        // Check if user exists
        const result= await db.query('SELECT * FROM account WHERE username= $1', [username]);
        if (result.rows.length === 0) {
            res.status(400).json({error: 'Invalid username or password'});
        }
        const user= result.rows[0]; 
        // Compare input text password against encrypted database hash string
        const isMatch= await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({error: 'Invalid username or password'}); 
        }
        
        //Generate a secure JWT token 
        const token=  jwt.sign(
            {id: user.user_id, username: user.username}, 
            process.env.JWT_SECRET, 
            {expiresIn: '1h'}

        )
        // Update the user login record metrics log history timestamp
        await db.query('UPDATE account SET last_login= NOW() WHERE user_id = $1', [user.user_id]);

        res.json({
            message: 'Login sucessful!', 
            token: token, 
            user: {user_id: user.user_id, username: user.username, email: user.email}
        })
    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Login server error'}); 
    }
};

// Fetch a list of all user records stored inside the system account table
// Route: GET /api/accounts
const getAccounts= async (req, res)=> {
    try {
        const result= await db.query('SELECT * FROM account ORDER BY user_id ASC');
        res.json(result.rows); 
    } catch (err) {
        console.log(err);
        res.status(500).json({error: 'Database read error'});
    }
}

// Retrieve account credentials (excluding password hashes) matching a specific parameter ID
// GET /api/accounts/:id
const getSpecificAccount= async (req, res) => {
    const userId= req.params.id; 
    try {
        
        const result= await db.query('SELECT user_id, username, email FROM account WHERE user_id= $1', [userId]); 
        if (result.rows.length===0) {
            return res.status(404).json({error: 'User not found'})
        }
        res.json(result.rows[0]);

    } catch (err) {
        console.log(err); 
        res.status(500).json({error: 'Database read error'})
    }
}
// Create account and add to database
// POST /api/accounts
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
        res.status(500).json({error: 'Database write error'})
    }
}

// Modify the email of existing user account
// PUT /api/accounts/:id
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

// Remove an account record matching the targeted parameter entry ID entirely from the system table context
// DELETE /api/accounts/:id
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
    getSpecificAccount,
    createAccount, 
    updateAccount, 
    deleteAccount, 
    registerUser, 
    loginUser
}