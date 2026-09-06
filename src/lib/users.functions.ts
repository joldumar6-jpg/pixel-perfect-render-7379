import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const PERFIS = ['chefe', 'chefe_setor', 'diretor', 'colaborador'] as const;
type PerfilTipo = (typeof PERFIS)[number];

function assertPerfil(v: unknown): PerfilTipo {
  if (typeof v !== 'string' || !PERFIS.includes(v as PerfilTipo)) {
    throw new Error('Perfil inválido');
  }
  return v as PerfilTipo;
}

async function garantirChefe(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'chefe',
  });
  if (error || !data) throw new Error('Apenas o Chefe de Departamento pode gerir utilizadores.');
}

export const listarUtilizadores = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await garantirChefe(context as never);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin
      .from('perfis')
      .select('id, user_id, nome, email, tipo_perfil, setor_id, created_at, setores(id, nome, cor)')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<{
      id: string;
      user_id: string;
      nome: string;
      email: string;
      tipo_perfil: string;
      setor_id: string | null;
      created_at: string;
      setores: { id: string; nome: string; cor: string } | null;
    }>;
  });

export const criarUtilizador = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nome: string; email: string; password: string; tipo_perfil: string; setor_id: string | null }) => {
    if (!input.nome?.trim()) throw new Error('Indique o nome.');
    if (!input.email?.trim()) throw new Error('Indique o email.');
    if (!input.password || input.password.length < 6) throw new Error('A palavra-passe precisa de pelo menos 6 caracteres.');
    return {
      nome: input.nome.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      tipo_perfil: assertPerfil(input.tipo_perfil),
      setor_id: input.setor_id || null,
    };
  })
  .handler(async ({ data, context }) => {
    await garantirChefe(context as never);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (authError || !created?.user) throw new Error(authError?.message ?? 'Não foi possível criar a conta.');

    const userId = created.user.id;

    const { error: perfilError } = await supabaseAdmin.from('perfis').insert({
      user_id: userId,
      nome: data.nome,
      email: data.email,
      tipo_perfil: data.tipo_perfil,
      setor_id: data.setor_id,
    } as never);
    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(perfilError.message);
    }

    // o trigger define a função inicial; forçamos a escolhida
    await supabaseAdmin.from('perfis').update({ tipo_perfil: data.tipo_perfil } as never).eq('user_id', userId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: data.tipo_perfil } as never);

    return { ok: true, userId };
  });

export const atualizarUtilizador = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; nome: string; tipo_perfil: string; setor_id: string | null }) => {
    if (!input.user_id) throw new Error('Utilizador inválido.');
    if (!input.nome?.trim()) throw new Error('Indique o nome.');
    return {
      user_id: input.user_id,
      nome: input.nome.trim(),
      tipo_perfil: assertPerfil(input.tipo_perfil),
      setor_id: input.setor_id || null,
    };
  })
  .handler(async ({ data, context }) => {
    await garantirChefe(context as never);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { error } = await supabaseAdmin
      .from('perfis')
      .update({ nome: data.nome, tipo_perfil: data.tipo_perfil, setor_id: data.setor_id } as never)
      .eq('user_id', data.user_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from('user_roles').delete().eq('user_id', data.user_id);
    await supabaseAdmin.from('user_roles').insert({ user_id: data.user_id, role: data.tipo_perfil } as never);

    return { ok: true };
  });

export const redefinirPalavraPasse = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; password: string }) => {
    if (!input.user_id) throw new Error('Utilizador inválido.');
    if (!input.password || input.password.length < 6) throw new Error('A palavra-passe precisa de pelo menos 6 caracteres.');
    return input;
  })
  .handler(async ({ data, context }) => {
    await garantirChefe(context as never);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const eliminarUtilizador = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string }) => {
    if (!input.user_id) throw new Error('Utilizador inválido.');
    return input;
  })
  .handler(async ({ data, context }) => {
    await garantirChefe(context as never);
    if (data.user_id === context.userId) throw new Error('Não pode eliminar a sua própria conta.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('user_roles').delete().eq('user_id', data.user_id);
    await supabaseAdmin.from('perfis').delete().eq('user_id', data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
