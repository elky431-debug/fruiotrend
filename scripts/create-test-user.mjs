// Crée (ou met à jour) un compte de test en production avec un plan actif
// et des crédits quasi-infinis. Lancer avec :
//   node --env-file=.env.local scripts/create-test-user.mjs [email] [password]
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.");
  process.exit(1);
}

const email = process.argv[2] || "test@pubmoi.com";
const password = process.argv[3] || "PubMoiTest2026!";
const CREDITS = 1_000_000_000; // effectivement illimité pour les tests
const PLAN = "pro";

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  // Parcourt les pages d'utilisateurs Auth pour retrouver l'email.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
    );
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  let userId;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created.error) {
    // Probablement déjà existant → on le retrouve et on réinitialise le mot de passe.
    const existing = await findUserByEmail(email);
    if (!existing) {
      throw created.error;
    }
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    console.log("Compte existant mis à jour :", email);
  } else {
    userId = created.data.user.id;
    console.log("Compte créé :", email);
  }

  const { error: upsertError } = await admin.from("users").upsert(
    {
      id: userId,
      email,
      plan: PLAN,
      credits: CREDITS,
    },
    { onConflict: "id" }
  );

  if (upsertError) throw upsertError;

  console.log("─────────────────────────────────────────");
  console.log("✅ Compte de test prêt en production");
  console.log("   Email    :", email);
  console.log("   Mot de passe :", password);
  console.log("   Plan     :", PLAN, "(paywall désactivé)");
  console.log("   Crédits  :", CREDITS.toLocaleString("fr-FR"));
  console.log("   User ID  :", userId);
  console.log("─────────────────────────────────────────");
}

main().catch((e) => {
  console.error("Erreur :", e.message || e);
  process.exit(1);
});
