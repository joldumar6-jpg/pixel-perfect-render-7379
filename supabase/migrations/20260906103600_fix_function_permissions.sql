-- Corrige permissões de execução das funções chamadas pelas políticas de Row Level Security (RLS)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_chefe() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_direcao() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.meu_setor() TO authenticated, service_role;

-- Atualiza a política de SELECT na tabela perfis
DROP POLICY IF EXISTS "Ver o proprio perfil, o setor ou todos se direcao" ON public.perfis;
DROP POLICY IF EXISTS "perfis_select_policy" ON public.perfis;
DROP POLICY IF EXISTS "Perfis visiveis a autenticados" ON public.perfis;

CREATE POLICY "Ver o proprio perfil, o setor ou todos se direcao"
ON public.perfis
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_direcao()
  OR (setor_id IS NOT NULL AND setor_id = public.meu_setor())
);
