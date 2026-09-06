ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'diretor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'chefe_setor';
ALTER TYPE public.tipo_perfil ADD VALUE IF NOT EXISTS 'diretor';
ALTER TYPE public.tipo_perfil ADD VALUE IF NOT EXISTS 'chefe_setor';

CREATE OR REPLACE FUNCTION public.proteger_tipo_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tipo_perfil IS DISTINCT FROM OLD.tipo_perfil AND NOT public.is_chefe() THEN
    NEW.tipo_perfil := OLD.tipo_perfil;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE POLICY "Chefe atribui funcoes" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.is_chefe());

CREATE POLICY "Chefe atualiza funcoes" ON public.user_roles
FOR UPDATE TO authenticated USING (public.is_chefe()) WITH CHECK (public.is_chefe());

CREATE POLICY "Chefe remove funcoes" ON public.user_roles
FOR DELETE TO authenticated USING (public.is_chefe());

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;