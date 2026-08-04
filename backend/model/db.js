import { Pool } from 'pg';
import pg from 'pg'; 
import dotenv from 'dotenv'; 

dotenv.config(); 

const Pool = new Pool({
    host: "localhost",
    connectionString: process.env.DATABASE_URL,
    port: 5432,
    user: "postgres",
    password: process.env.DB_PASSWORD,
    database: "KeyDrive",
})

const client = await pool.connect(); 
console.log("Connected to Postgres");
client.release(); 

export default Pool; 

