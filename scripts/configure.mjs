import { writeFile } from 'node:fs/promises';
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (url || publishableKey) {
  if (!url || !publishableKey) throw Error('Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw Error('SUPABASE_URL must use HTTPS.');
  let publicKey = publishableKey.startsWith('sb_publishable_');
  try { publicKey ||= JSON.parse(Buffer.from(publishableKey.split('.')[1], 'base64url')).role === 'anon'; } catch {}
  if (!publicKey) throw Error('Use a publishable or anon key, never a secret/service-role key.');
  await writeFile(new URL('../public/supabase-config.js', import.meta.url), `// Generated public configuration.\nexport const supabaseConfig = ${JSON.stringify({ url: parsed.origin, publishableKey })};\n`);
}
