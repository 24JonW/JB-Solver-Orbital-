const express = require('express');
const cors= require('cors');
//const db = require('./config/db'); // Imports our Postgres link
require('dotenv').config();

const app = express();

app.use(cors()) // Enable CORS for all incoming frontend requests!
// Middleware to parse incoming json data payloads
app.use(express.json());

const accountRoutes= require('./routes/userRoutes'); 
app.use('/api/accounts', accountRoutes);

app.get('/', (req, res) => {
    res.send('🚀 Welcome to the JB-Solver-Orbital Backend API!');
});

// A test baseline API route to make sure database is responding


// app.get('/account', async (req, res)=> {
//   try {
//     const result= await db.query('SELECT * FROM account');
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err); 
//     res.status(500).json({error: 'Database error'});
//   }
// });

// app.get('/api/test-db', async (req, res) => {
//   try {
//     const result = await db.query('SELECT NOW();');
//     res.json({ message: "Backend connected to Postgres!", time: result.rows[0] });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Database connection failed" });
//   }
// });

const PORT = process.env.PORT || 5433;
app.listen(PORT, () => {
  console.log(`🚀 Server running cleanly on port ${PORT}`);
});