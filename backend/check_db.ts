import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: 'postgresql://postgres.rqlwxekmsrupqofjsteo:Pamirfulya66.@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
});

async function checkTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log("Tables in DB:", res.rows.map(r => r.table_name));

    const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages';
    `);
    console.log("Messages columns:", res2.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}
checkTables();
