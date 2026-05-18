/**
 * delete-supabase-bucket.mjs
 * Supprime tous les fichiers d'un bucket Supabase Storage.
 *
 * Usage : node scripts/delete-supabase-bucket.mjs <bucket>
 * Exemple : node scripts/delete-supabase-bucket.mjs covers
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const bucket = process.argv[2];
if (!bucket) {
  console.error("❌ Usage : node scripts/delete-supabase-bucket.mjs <bucket>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

async function listAllFiles() {
  const files = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list("", { limit, offset });
    if (error || !data || data.length === 0) break;
    files.push(...data.filter(f => f.name && !f.name.endsWith("/")));
    if (data.length < limit) break;
    offset += limit;
  }
  return files;
}

async function main() {
  console.log(`🗑️  Suppression du bucket "${bucket}" sur Supabase\n`);

  const files = await listAllFiles();
  console.log(`   ${files.length} fichier(s) trouvé(s)`);
  if (files.length === 0) {
    console.log("   Rien à supprimer.");
    return;
  }

  // Suppression par lots de 100
  const BATCH = 100;
  let deleted = 0;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH).map(f => f.name);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) {
      console.error(`   ❌ Erreur suppression batch ${i}-${i + BATCH}:`, error.message);
    } else {
      deleted += batch.length;
      console.log(`   ✓ ${deleted}/${files.length} fichiers supprimés`);
    }
  }

  console.log(`\n✅ Bucket "${bucket}" vidé avec succès !`);
}

main().catch(console.error);
