import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const criarContaChefe = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        nome: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);

    const { error: perfilError } = await supabaseAdmin.from("perfis").insert({
      user_id: created.user.id,
      nome: data.nome,
      email: data.email,
      setor_id: null,
    });
    if (perfilError) throw new Error(perfilError.message);

    return { ok: true, userId: created.user.id };
  });
