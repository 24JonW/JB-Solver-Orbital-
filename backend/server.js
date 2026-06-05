const express = require('express');
const cors= require('cors');
const db = require('./config/db'); // Imports our Postgres link
require('dotenv').config(); //Old version

const app = express();

app.use(cors()) // Enable CORS for all incoming frontend requests!
// Middleware to parse incoming json data payloads
app.use(express.json());

const accountRoutes= require('./routes/userRoutes'); 
app.use('/api/accounts', accountRoutes);

//Added route configuration to groupRoutes
const groupRoutes= require('./routes/groupRoutes'); 
app.use('/api/groups', groupRoutes);

app.get('/', (req, res) => {
    res.send('🚀 Welcome to the JB-Solver-Orbital Backend API!');
});

const PORT = process.env.PORT || 5433;
app.listen(PORT,async () => {
  console.log(`🚀 Server running cleanly on port ${PORT}`);
  // FORCE INITIAL CONNECTION TEST HERE
  try {
    console.log('Testing connection to Supabase...');
    const res= await db.query('SELECT NOW()'); 
    console.log('✅ PostgreSQL connected successfully!');
    // This forces the pool to open a pipeline, which fires your pool.on('connect') listener!
  } catch (err) {
    console.error('❌ Failed to connect to Supabase Cloud on startup:', err.message);
  }
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

