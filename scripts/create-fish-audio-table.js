const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xniwslztgcidwfcuzxlo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuaXdzbHp0Z2NpZHdmY3V6eGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAzMTA2NiwiZXhwIjoyMDg0NjA3MDY2fQ.TA_FVrT6uglHAZY0SVXJSnFtOmSTKRyr5QH0mxGgY8E'
);

async function main() {
  // Check current tables
  const tables = ['fish_audio_integration', 'app_config'];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id').limit(1);
    console.log(`${t}: ${error ? error.message : 'exists, ' + JSON.stringify(data)}`);
  }
  
  // Check what columns openrouter_integration has
  const { data: orData, error: orError } = await supabase
    .from('openrouter_integration')
    .select('*')
    .limit(1);
  console.log('openrouter_integration:', orError ? orError.message : JSON.stringify(orData));
  
  // Check model_slots
  const { data: msData, error: msError } = await supabase
    .from('model_slots')
    .select('*');
  console.log('model_slots:', msError ? msError.message : JSON.stringify(msData));
  
  // Check voices
  const { data: vData, error: vError } = await supabase
    .from('voices')
    .select('*');
  console.log('voices:', vError ? vError.message : JSON.stringify(vData));
}

main();
