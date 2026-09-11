import { supabase } from '@/integrations/supabase/client';

/**
 * Regista uma ação no log de auditoria. Nunca lança — falhar a auditoria
 * não pode impedir a operação principal.
 */
export async function registarAcao(params: {
  userId: string;
  userNome?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  detalhes?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await supabase.from('log_auditoria').insert({
      user_id: params.userId,
      user_nome: params.userNome ?? null,
      acao: params.acao,
      entidade: params.entidade,
      entidade_id: params.entidadeId ?? null,
      detalhes: (params.detalhes ?? null) as never,
    } as never);
  } catch (err) {
    console.error('Falha ao registar auditoria:', err);
  }
}
