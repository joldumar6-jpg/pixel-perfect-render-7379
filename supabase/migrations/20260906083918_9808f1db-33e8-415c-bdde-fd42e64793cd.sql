REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_chefe() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.meu_setor() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.atribuir_funcao_perfil() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.proteger_tipo_perfil() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;