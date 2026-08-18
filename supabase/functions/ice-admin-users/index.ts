import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return reply({ message: "Sessão em falta." }, 401);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return reply({ message: "Sessão inválida ou expirada." }, 401);
    const adminClient = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile } = await adminClient.from("profiles").select("role,active").eq("user_id", user.id).single();
    if (!profile?.active || profile.role !== "admin") return reply({ message: "Apenas o Administrador pode gerir utilizadores." }, 403);

    if (req.method === "GET") {
      const { data: authData, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const { data: profiles, error: profileError } = await adminClient.from("profiles").select("user_id,full_name,username,role,active,created_at");
      if (profileError) throw profileError;
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return reply({ users: authData.users.map((u: any) => ({ id: u.id, email: u.email, ...(profileMap.get(u.id) || {}), created_at: u.created_at })) });
    }

    const body = await req.json().catch(() => ({}));
    if (req.method === "POST") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const full_name = String(body.full_name || "").trim();
      const username = String(body.username || "").trim();
      const role = String(body.role || "viewer");
      if (!email || password.length < 8) return reply({ message: "Informe um e-mail válido e palavra-passe com pelo menos 8 caracteres." }, 400);
      const { data: created, error } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, username } });
      if (error) return reply({ message: error.message }, 400);
      const { error: profileError } = await adminClient.from("profiles").upsert({ user_id: created.user.id, full_name, username, role, active: true }, { onConflict: "user_id" });
      if (profileError) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        throw profileError;
      }
      return reply({ message: "Utilizador criado.", id: created.user.id }, 201);
    }

    const target = String(body.user_id || "");
    if (!target) return reply({ message: "Utilizador não identificado." }, 400);
    if (target === user.id && req.method === "DELETE") return reply({ message: "Não pode apagar a conta actualmente em uso." }, 400);
    if (req.method === "PATCH") {
      const authChanges: Record<string, unknown> = {};
      if (body.email) authChanges.email = String(body.email).trim().toLowerCase();
      if (body.password) authChanges.password = String(body.password);
      if (Object.keys(authChanges).length) {
        const { error } = await adminClient.auth.admin.updateUserById(target, authChanges);
        if (error) return reply({ message: error.message }, 400);
      }
      const profileChanges: Record<string, unknown> = {};
      for (const key of ["full_name", "username", "role", "active"]) if (body[key] !== undefined) profileChanges[key] = body[key];
      if (Object.keys(profileChanges).length) {
        const { error } = await adminClient.from("profiles").update(profileChanges).eq("user_id", target);
        if (error) throw error;
      }
      return reply({ message: "Utilizador actualizado." });
    }
    if (req.method === "DELETE") {
      const { error } = await adminClient.auth.admin.deleteUser(target);
      if (error) return reply({ message: error.message }, 400);
      return reply({ message: "Utilizador apagado." });
    }
    return reply({ message: "Método não permitido." }, 405);
  } catch (error) {
    return reply({ message: error instanceof Error ? error.message : "Erro interno." }, 500);
  }
});
