import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: 'postgresql://postgres.rqlwxekmsrupqofjsteo:Pamirfulya66.@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
});

const sql = `
ALTER TABLE messages 
ALTER COLUMN offer_price TYPE VARCHAR(255);
`;

async function run() {
  try {
    await pool.query(sql);
    console.log('Column altered successfully!');
  } catch (error) {
    console.error('Error altering column:', error);
  } finally {
    pool.end();
  }
}
run();
