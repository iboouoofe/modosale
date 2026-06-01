import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: 'postgresql://postgres.rqlwxekmsrupqofjsteo:Pamirfulya66.@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
});

const sql = `
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS offer_price VARCHAR(255),
ADD COLUMN IF NOT EXISTS offer_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS image_url TEXT;
`;

async function run() {
  try {
    await pool.query(sql);
    console.log('Messages table altered successfully!');
  } catch (error) {
    console.error('Error altering table:', error);
  } finally {
    pool.end();
  }
}
run();
