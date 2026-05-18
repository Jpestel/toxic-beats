/**
 * migrate-storage.mjs
 * Télécharge tous les fichiers depuis Supabase Storage
 * et les copie sur le serveur via SCP.
 *
 * Usage : node scripts/migrate-storage.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import { mkdirSync, createWriteStream, rmSync } from "fs";
import { join } from "path";
import https from "https";
import http from "http";

// ── Config ────────────────────────────────────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SERVER_USER       = process.env.SERVER_USER ?? "toxic";
const SERVER_HOST       = process.env.SERVER_HOST ?? "87.106.196.227";
const SERVER_BASE       = "/var/www/toxic-files";
const LOCAL_TMP         = "/tmp/toxic-migration";

const BUCKETS = ["beats", "previews", "covers"];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

// ── Helpers ───────────────────────────────────────────────

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => { rmSync(dest, { force: true }); reject(err); });
  });
}

async function listAllFiles(bucket) {
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

// ── Main ──────────────────────────────────────────────────

async function main() {
  console.log("🚀 Démarrage de la migration Supabase → Serveur\n");

  mkdirSync(LOCAL_TMP, { recursive: true });

  for (const bucket of BUCKETS) {
    console.log(`\n📦 Bucket : ${bucket}`);
    const files = await listAllFiles(bucket);
    console.log(`   ${files.length} fichier(s) trouvé(s)`);

    if (files.length === 0) continue;

    const localDir = join(LOCAL_TMP, bucket);
    mkdirSync(localDir, { recursive: true });

    for (const file of files) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(file.name);
      const url = data.publicUrl;
      const localPath = join(localDir, file.name);

      process.stdout.write(`   ↓ ${file.name} ... `);
      try {
        await download(url, localPath);
        console.log("✓");
      } catch (err) {
        console.log(`✗ (${err.message})`);
      }
    }

    // Copie vers le serveur via SCP
    console.log(`   📤 Upload vers ${SERVER_HOST}:${SERVER_BASE}/${bucket}/`);
    try {
      execSync(
        `scp -r ${localDir}/* ${SERVER_USER}@${SERVER_HOST}:${SERVER_BASE}/${bucket}/`,
        { stdio: "inherit" }
      );
      console.log(`   ✅ ${bucket} migré avec succès`);
    } catch (err) {
      console.error(`   ❌ Erreur SCP pour ${bucket}:`, err.message);
    }
  }

  // Nettoyage
  rmSync(LOCAL_TMP, { recursive: true, force: true });
  console.log("\n✅ Migration terminée !");
  console.log(`   Fichiers disponibles sur le serveur dans : ${SERVER_BASE}`);
}

main().catch(console.error);
