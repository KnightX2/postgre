// db.js
const { Client } = require('pg');
require('dotenv').config();

// Database connection parameters loaded from environment variables
console.log('Database connection initiated for:', {
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  // Credentials hidden for security
});

const client = new Client({

  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

client.connect()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Error connecting to the database', err));

module.exports = { client };  // Export the client for use in other files
