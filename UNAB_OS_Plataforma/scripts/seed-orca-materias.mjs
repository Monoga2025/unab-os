import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project-ref.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_your_key";

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const subjects = [
  "Estadística Inferencial y Muestreo",
  "Circuitos Eléctricos",
  "Ecuaciones Diferenciales",
  "Mecanismos",
  "Laboratorio de Ondas y Partículas",
  "Ondas y Partículas",
  "Materiales",
  "Dibujo Asistido por Computador"
];

const professors = [
  "Raúl Ortiz",
  "Christian Sarmiento",
  "Sebastián Roa Prada",
  "Juan Manuel Argüello Espinosa"
];

async function seed() {
  const timestamp = Date.now();
  const email = `seed_catalog_${timestamp}@unab.edu.co`;
  const password = process.env.SEED_PASSWORD ?? "change-me";

  console.log(`Creating seed session ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) throw authError;

  console.log("Seeding subjects via RPC...");
  for (const display_name of subjects) {
    const { data, error } = await supabase.rpc("create_or_get_subject", { p_display_name: display_name });
    if (error) console.error(`Error inserting subject ${display_name}:`, error.message);
    else console.log(`Subject OK (${data}): ${display_name}`);
  }

  console.log("Seeding professors via RPC...");
  for (const display_name of professors) {
    const { data, error } = await supabase.rpc("create_or_get_professor", { p_display_name: display_name });
    if (error) console.error(`Error inserting professor ${display_name}:`, error.message);
    else console.log(`Professor OK (${data}): ${display_name}`);
  }
}

seed().catch(console.error);
