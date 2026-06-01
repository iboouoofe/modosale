import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: 'postgresql://postgres.rqlwxekmsrupqofjsteo:Pamirfulya66.@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
});

const sql = `
ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS chk_different_parties;
`;

async function run() {
  try {
    await pool.query(sql);
    console.log('Constraint removed successfully!');
  } catch (error) {
    console.error('Error removing constraint:', error);
  } finally {
    pool.end();
  }
}
run();
