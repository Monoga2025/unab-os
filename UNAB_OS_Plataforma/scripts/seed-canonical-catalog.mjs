import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project-ref.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_your_key";

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function normalizeCatalogKey(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[\p{P}\p{S}_]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const canonicalSubjects = [
  "Cálculo",
  "Ecuaciones Diferenciales",
  "Circuitos Eléctricos",
  "Mecanismos",
  "Materiales",
  "Dibujo Asistido por Computador",
  "Laboratorio de Ondas y Partículas",
  "Ondas y Partículas",
  "Estadística Inferencial y Muestreo",
];

const canonicalProfessors = [
  "Sebastián Roa Prada",
  "Juan Manuel Argüello Espinosa",
  "Raúl Ortiz",
  "Christian Sarmiento",
  "Carlos Martínez",
  "Docente UNAB",
];

async function run() {
  const timestamp = Date.now();
  const email = `seed_admin_${timestamp}@unab.edu.co`;
  const password = process.env.SEED_PASSWORD ?? "change-me";

  console.log(`Authenticating seed admin ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) throw authError;

  console.log("Seeding canonical subjects...");
  for (const display_name of canonicalSubjects) {
    const { data, error } = await supabase.rpc("create_or_get_subject", { p_display_name: display_name });
    if (error) console.error(`Error subject ${display_name}:`, error.message);
    else console.log(`✓ Subject: ${display_name} -> ${data}`);
  }

  console.log("Seeding canonical professors...");
  for (const display_name of canonicalProfessors) {
    const { data, error } = await supabase.rpc("create_or_get_professor", { p_display_name: display_name });
    if (error) console.error(`Error professor ${display_name}:`, error.message);
    else console.log(`✓ Professor: ${display_name} -> ${data}`);
  }
}

run().catch(console.error);
