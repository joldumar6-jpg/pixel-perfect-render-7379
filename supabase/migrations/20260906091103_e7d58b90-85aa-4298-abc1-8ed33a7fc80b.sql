CREATE OR REPLACE FUNCTION public.is_direcao()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'chefe'::public.app_role)
      OR public.has_role(auth.uid(), 'diretor'::public.app_role)
$$;

REVOKE EXECUTE ON FUNCTION public.is_direcao() FROM anon, public;

DROP POLICY IF EXISTS "Perfis visiveis a autenticados" ON public.perfis;

CREATE POLICY "Ver o proprio perfil, o setor ou todos se direcao"
ON public.perfis
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_direcao()
  OR (setor_id IS NOT NULL AND setor_id = public.meu_setor())
);