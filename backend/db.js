const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'))
    ? false
    : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

module.exports = pool;
