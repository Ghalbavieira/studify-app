export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim());
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local e reinicie o servidor.");
  }
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { throw new Error("NEXT_PUBLIC_SUPABASE_URL deve ser a URL válida do projeto Supabase."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    throw new Error("A URL do Supabase deve usar HTTPS, exceto no desenvolvimento local.");
  }
  if (!publishableKey.startsWith("sb_publishable_")) {
    throw new Error("Use uma Publishable key (sb_publishable_...) em NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Chaves secretas e legadas não são aceitas.");
  }
  return { url, publishableKey };
}
