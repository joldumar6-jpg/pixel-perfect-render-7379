import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/criar-chefe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-setup-secret");
        if (!secret || secret !== process.env["LOVABLE_CRON_SECRET"]) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json()) as {
          email?: string;
          password?: string;
          nome?: string;
        };
        if (!body.email || !body.password || !body.nome) {
          return Response.json({ error: "email, password e nome são obrigatórios" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
        });
        if (error) {
          return Response.json({ error: error.message }, { status: 400 });
        }

        const { error: perfilError } = await supabaseAdmin.from("perfis").insert({
          user_id: created.user.id,
          nome: body.nome,
          email: body.email,
          setor_id: null,
        });
        if (perfilError) {
          return Response.json({ error: perfilError.message }, { status: 400 });
        }

        return Response.json({ ok: true, userId: created.user.id });
      },
    },
  },
});
