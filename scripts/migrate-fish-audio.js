const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xniwslztgcidwfcuzxlo:AJY3VF5jFxe25zPitxs95zNE6hD0E6gPu6ZTEFWberI@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS fish_audio_integration (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        api_key_encrypted TEXT,
        api_key_preview TEXT,
        is_configured BOOLEAN NOT NULL DEFAULT false,
        last_validated_at TIMESTAMPTZ,
        last_validation_status TEXT,
        last_validation_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log('Table created');

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS fish_audio_integration_singleton
        ON fish_audio_integration ((true));
    `);
    console.log('Singleton index created');

    await client.query(`ALTER TABLE fish_audio_integration ENABLE ROW LEVEL SECURITY;`);
    console.log('RLS enabled');

    const { rows } = await client.query(`
      SELECT 1 FROM pg_policies WHERE tablename = 'fish_audio_integration' LIMIT 1;
    `);

    if (rows.length === 0) {
      await client.query(`
        CREATE POLICY "Admin full access on fish_audio_integration"
          ON fish_audio_integration FOR ALL
          TO authenticated
          USING (is_admin())
          WITH CHECK (is_admin());
      `);
      console.log('Admin policy created');

      await client.query(`
        CREATE POLICY "Block non-admin select on fish_audio_integration"
          ON fish_audio_integration FOR SELECT
          TO anon, authenticated
          USING (false);
      `);
      console.log('Block policy created');
    }

    // Add trigger
    await client.query(`
      DROP TRIGGER IF EXISTS fish_audio_integration_updated_at ON fish_audio_integration;
      CREATE TRIGGER fish_audio_integration_updated_at
        BEFORE UPDATE ON fish_audio_integration
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);
    console.log('Trigger created');

    // Also add openrouter_integration columns if they don't exist (for DELETE key support)
    const orCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'openrouter_integration';
    `);
    const existingCols = orCols.rows.map(r => r.column_name);
    console.log('openrouter_integration columns:', existingCols);

    console.log('Migration complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });