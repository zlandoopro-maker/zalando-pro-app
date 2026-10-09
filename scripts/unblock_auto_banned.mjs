import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mklzftbjvngwwiivdkhs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vfa-EIY2FIK0WM1yaRicOQ_FmDXE51x";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('🔍 Checking users in Supabase...');

  const { data: users, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('❌ Error fetching users:', error.message);
    process.exit(1);
  }

  console.log(`Found ${users.length} total user(s) in Supabase.`);

  for (const user of users) {
    const isBlocked = Boolean(user.is_blocked);

    console.log(`- User ${user.email || user.id}: is_blocked=${isBlocked}`);

    if (isBlocked) {
      console.log(`  Unblocking user ${user.email || user.id}...`);
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          is_blocked: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateErr) {
        console.error(`  ❌ Failed to unblock ${user.id}:`, updateErr.message);
      } else {
        console.log(`  ✅ Successfully unblocked user ${user.email || user.id}!`);
      }
    }
  }

  console.log('\n✅ All users unblocked in Supabase!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
