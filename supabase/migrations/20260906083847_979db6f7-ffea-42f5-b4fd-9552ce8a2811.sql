-- ENUMs
CREATE TYPE public.tipo_perfil AS ENUM ('chefe', 'colaborador');
CREATE TYPE public.estado_atividade AS ENUM ('pendente', 'em_curso', 'concluido');
CREATE TYPE public.criticidade AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE public.app_role AS ENUM ('chefe', 'colaborador');

-- SETORES
CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  cor VARCHAR(7) NOT NULL,
  icone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.setores TO authenticated;
GRANT ALL ON public.setores TO service_role;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

INSERT INTO public.setores (nome, descricao, cor, icone) VALUES
  ('Património', 'Gestão e manutenção do património', '#3b82f6', 'building'),
  ('Canalização', 'Redes de água e saneamento', '#06b6d4', 'droplets'),
  ('Jardinagem', 'Espaços verdes e jardins', '#10b981', 'trees'),
  ('Construção', 'Obras e construção civil', '#f59e0b', 'hard-hat'),
  ('Serralharia', 'Estruturas e trabalhos metálicos', '#f97316', 'wrench'),
  ('Eletricidade', 'Instalações elétricas', '#eab308', 'zap'),
  ('Limpeza', 'Higiene e limpeza urbana', '#14b8a6', 'spray-can'),
  ('Marcenaria', 'Trabalhos em madeira', '#ec4899', 'sofa');

-- PERFIS
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  tipo_perfil public.tipo_perfil NOT NULL DEFAULT 'colaborador',
  setor_id UUID REFERENCES public.setores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- USER ROLES (fonte de verdade das permissões)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_chefe()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'chefe'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.meu_setor()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setor_id FROM public.perfis WHERE user_id = auth.uid()
$$;

-- Atribui a função ao criar perfil: o primeiro utilizador fica chefe
CREATE OR REPLACE FUNCTION public.atribuir_funcao_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'chefe') THEN
    v_role := 'colaborador';
  ELSE
    v_role := 'chefe';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  NEW.tipo_perfil := v_role::text::public.tipo_perfil;
  RETURN NEW;
END;
$$;

CREATE TRIGGER perfis_atribuir_funcao
BEFORE INSERT ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.atribuir_funcao_perfil();

-- Impede que alguém altere o próprio tipo de perfil
CREATE OR REPLACE FUNCTION public.proteger_tipo_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo_perfil IS DISTINCT FROM OLD.tipo_perfil THEN
    NEW.tipo_perfil := OLD.tipo_perfil;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER perfis_proteger_tipo
BEFORE UPDATE ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.proteger_tipo_perfil();

-- ATIVIDADES
CREATE TABLE public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id UUID NOT NULL REFERENCES public.setores(id),
  responsavel_id UUID REFERENCES public.perfis(id),
  titulo VARCHAR(300) NOT NULL,
  descricao TEXT,
  estado public.estado_atividade NOT NULL DEFAULT 'pendente',
  criticidade public.criticidade NOT NULL DEFAULT 'media',
  data_atividade DATE NOT NULL DEFAULT CURRENT_DATE,
  localizacao VARCHAR(255),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atividades TO authenticated;
GRANT ALL ON public.atividades TO service_role;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

-- HISTORICO
CREATE TABLE public.historico_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  estado_anterior public.estado_atividade,
  estado_novo public.estado_atividade NOT NULL,
  observacao TEXT,
  data_alteracao TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.historico_atividades TO authenticated;
GRANT ALL ON public.historico_atividades TO service_role;
ALTER TABLE public.historico_atividades ENABLE ROW LEVEL SECURITY;

-- RELATORIOS IA
CREATE TABLE public.relatorios_executivos_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_mes INTEGER NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_ano INTEGER NOT NULL CHECK (periodo_ano >= 2020),
  gerado_por UUID NOT NULL,
  taxa_global NUMERIC,
  dados_setores JSONB,
  conteudo_completo TEXT,
  data_geracao TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.relatorios_executivos_ia TO authenticated;
GRANT ALL ON public.relatorios_executivos_ia TO service_role;
ALTER TABLE public.relatorios_executivos_ia ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Setores visiveis a autenticados" ON public.setores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Perfis visiveis a autenticados" ON public.perfis
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Criar o proprio perfil" ON public.perfis
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Atualizar o proprio perfil" ON public.perfis
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_chefe())
  WITH CHECK (user_id = auth.uid() OR public.is_chefe());

CREATE POLICY "Ver as proprias funcoes" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_chefe());

CREATE POLICY "Ver atividades do setor ou todas se chefe" ON public.atividades
  FOR SELECT TO authenticated USING (public.is_chefe() OR setor_id = public.meu_setor());
CREATE POLICY "Criar atividades no proprio setor" ON public.atividades
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_chefe() OR setor_id = public.meu_setor()));
CREATE POLICY "Atualizar atividades do setor" ON public.atividades
  FOR UPDATE TO authenticated USING (public.is_chefe() OR setor_id = public.meu_setor())
  WITH CHECK (public.is_chefe() OR setor_id = public.meu_setor());
CREATE POLICY "Apenas chefe elimina atividades" ON public.atividades
  FOR DELETE TO authenticated USING (public.is_chefe());

CREATE POLICY "Ver historico das atividades visiveis" ON public.historico_atividades
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.atividades a WHERE a.id = atividade_id
            AND (public.is_chefe() OR a.setor_id = public.meu_setor()))
  );
CREATE POLICY "Registar historico" ON public.historico_atividades
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Apenas chefe ve relatorios" ON public.relatorios_executivos_ia
  FOR SELECT TO authenticated USING (public.is_chefe());
CREATE POLICY "Apenas chefe cria relatorios" ON public.relatorios_executivos_ia
  FOR INSERT TO authenticated WITH CHECK (public.is_chefe() AND gerado_por = auth.uid());

-- updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER atividades_updated_at BEFORE UPDATE ON public.atividades
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();