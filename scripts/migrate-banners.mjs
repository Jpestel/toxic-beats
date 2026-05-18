/**
 * migrate-banners.mjs
 * Télécharge les bannières depuis Supabase Storage
 * et les copie sur le serveur via SCP.
 *
 * Usage : node scripts/migrate-banners.mjs
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
const LOCAL_TMP         = "/tmp/toxic-migration-banners";

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
  console.log("🚀 Migration des bannières Supabase → Serveur\n");

  const localDir = join(LOCAL_TMP, "banners");
  mkdirSync(localDir, { recursive: true });

  console.log("📦 Bucket : banners");
  const files = await listAllFiles("banners");
  console.log(`   ${files.length} fichier(s) trouvé(s)`);

  if (files.length === 0) {
    console.log("   Aucun fichier à migrer.");
    return;
  }

  for (const file of files) {
    const { data } = supabase.storage.from("banners").getPublicUrl(file.name);
    const localPath = join(localDir, file.name);

    process.stdout.write(`   ↓ ${file.name} ... `);
    try {
      await download(data.publicUrl, localPath);
      console.log("✓");
    } catch (err) {
      console.log(`✗ (${err.message})`);
    }
  }

  // Créer le dossier sur le serveur si besoin
  try {
    execSync(`ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_BASE}/banners"`, { stdio: "inherit" });
  } catch { /* ignoré */ }

  // Copie vers le serveur via SCP
  console.log(`\n📤 Upload vers ${SERVER_HOST}:${SERVER_BASE}/banners/`);
  execSync(
    `scp -r ${localDir}/* ${SERVER_USER}@${SERVER_HOST}:${SERVER_BASE}/banners/`,
    { stdio: "inherit" }
  );

  // Nettoyage
  rmSync(LOCAL_TMP, { recursive: true, force: true });

  console.log("\n✅ Bannières migrées avec succès !");
  console.log(`   Fichiers disponibles sur : https://toxic-files.com/files/banners/`);
  console.log("\n⚠️  N'oublie pas de mettre à jour l'URL de la bannière dans les settings Supabase !");
}

main().catch(console.error);
