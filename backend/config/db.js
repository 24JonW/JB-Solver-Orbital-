const {Pool} = require('pg'); 
require('dotenv').config(); 

// Create a connection pool using settings stored in your environment file
const pool= new Pool({
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5433, 
    database: process.env.DB_NAME 
}); 

pool.on('connect', ()=> {
    console.log('PostgrSQL connected successfully!');
})

module.exports= {
    query: (text, params)=> pool.query(text, params),
}