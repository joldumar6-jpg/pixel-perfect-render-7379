-- TAREFAS
CREATE TABLE public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id uuid NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  titulo varchar NOT NULL,
  concluida boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  responsavel_id uuid REFERENCES public.perfis(id),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT ALL ON public.tarefas TO service_role;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver tarefas das atividades visiveis" ON public.tarefas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.atividades a WHERE a.id = atividade_id AND (public.is_direcao() OR a.setor_id = public.meu_setor())));
CREATE POLICY "Criar tarefas nas atividades visiveis" ON public.tarefas FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.atividades a WHERE a.id = atividade_id AND (public.is_direcao() OR a.setor_id = public.meu_setor())));
CREATE POLICY "Atualizar tarefas das atividades visiveis" ON public.tarefas FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.atividades a WHERE a.id = atividade_id AND (public.is_direcao() OR a.setor_id = public.meu_setor())))
WITH CHECK (EXISTS (SELECT 1 FROM public.atividades a WHERE a.id = atividade_id AND (public.is_direcao() OR a.setor_id = public.meu_setor())));
CREATE POLICY "Eliminar tarefas das atividades visiveis" ON public.tarefas FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.atividades a WHERE a.id = atividade_id AND (public.is_direcao() OR a.setor_id = public.meu_setor())));
CREATE TRIGGER tarefas_updated_at BEFORE UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OCORRENCIAS
CREATE TABLE public.ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.setores(id),
  atividade_id uuid REFERENCES public.atividades(id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES public.perfis(id),
  titulo varchar NOT NULL,
  descricao text,
  gravidade public.criticidade NOT NULL DEFAULT 'media',
  estado public.estado_atividade NOT NULL DEFAULT 'pendente',
  localizacao varchar,
  foto_url text,
  data_ocorrencia date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocorrencias TO authenticated;
GRANT ALL ON public.ocorrencias TO service_role;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver ocorrencias do setor" ON public.ocorrencias FOR SELECT TO authenticated
USING (public.is_direcao() OR setor_id = public.meu_setor());
CREATE POLICY "Criar ocorrencias no setor" ON public.ocorrencias FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (public.is_direcao() OR setor_id = public.meu_setor()));
CREATE POLICY "Atualizar ocorrencias do setor" ON public.ocorrencias FOR UPDATE TO authenticated
USING (public.is_direcao() OR setor_id = public.meu_setor())
WITH CHECK (public.is_direcao() OR setor_id = public.meu_setor());
CREATE POLICY "Apenas chefe elimina ocorrencias" ON public.ocorrencias FOR DELETE TO authenticated
USING (public.is_chefe());
CREATE TRIGGER ocorrencias_updated_at BEFORE UPDATE ON public.ocorrencias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DOCUMENTOS
CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar NOT NULL,
  descricao text,
  categoria varchar NOT NULL DEFAULT 'geral',
  setor_id uuid REFERENCES public.setores(id),
  atividade_id uuid REFERENCES public.atividades(id) ON DELETE SET NULL,
  ficheiro_url text NOT NULL,
  ficheiro_path text NOT NULL,
  tipo varchar,
  tamanho bigint,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver documentos do setor" ON public.documentos FOR SELECT TO authenticated
USING (public.is_direcao() OR setor_id IS NULL OR setor_id = public.meu_setor());
CREATE POLICY "Carregar documentos" ON public.documentos FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (public.is_direcao() OR setor_id IS NULL OR setor_id = public.meu_setor()));
CREATE POLICY "Atualizar documentos do setor" ON public.documentos FOR UPDATE TO authenticated
USING (public.is_direcao() OR created_by = auth.uid())
WITH CHECK (public.is_direcao() OR created_by = auth.uid());
CREATE POLICY "Eliminar documentos proprios ou chefe" ON public.documentos FOR DELETE TO authenticated
USING (public.is_chefe() OR created_by = auth.uid());
CREATE TRIGGER documentos_updated_at BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NOTIFICACOES
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo varchar NOT NULL,
  mensagem text,
  tipo varchar NOT NULL DEFAULT 'info',
  link varchar,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver as proprias notificacoes" ON public.notificacoes FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Marcar as proprias notificacoes" ON public.notificacoes FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Apagar as proprias notificacoes" ON public.notificacoes FOR DELETE TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Direcao cria notificacoes" ON public.notificacoes FOR INSERT TO authenticated
WITH CHECK (public.is_direcao() OR user_id = auth.uid());
CREATE INDEX notificacoes_user_idx ON public.notificacoes(user_id, lida);

-- LOG DE AUDITORIA
CREATE TABLE public.log_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_nome varchar,
  acao varchar NOT NULL,
  entidade varchar NOT NULL,
  entidade_id uuid,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.log_auditoria TO authenticated;
GRANT ALL ON public.log_auditoria TO service_role;
ALTER TABLE public.log_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Direcao ve o registo" ON public.log_auditoria FOR SELECT TO authenticated
USING (public.is_direcao());
CREATE POLICY "Registar acoes proprias" ON public.log_auditoria FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE INDEX log_auditoria_created_idx ON public.log_auditoria(created_at DESC);

-- CHECKLISTS
CREATE TABLE public.checklist_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar NOT NULL,
  descricao text,
  setor_id uuid REFERENCES public.setores(id),
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_modelos TO authenticated;
GRANT ALL ON public.checklist_modelos TO service_role;
ALTER TABLE public.checklist_modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver modelos" ON public.checklist_modelos FOR SELECT TO authenticated
USING (public.is_direcao() OR setor_id IS NULL OR setor_id = public.meu_setor());
CREATE POLICY "Direcao cria modelos" ON public.checklist_modelos FOR INSERT TO authenticated
WITH CHECK (public.is_direcao() AND created_by = auth.uid());
CREATE POLICY "Direcao atualiza modelos" ON public.checklist_modelos FOR UPDATE TO authenticated
USING (public.is_direcao()) WITH CHECK (public.is_direcao());
CREATE POLICY "Chefe elimina modelos" ON public.checklist_modelos FOR DELETE TO authenticated
USING (public.is_chefe());
CREATE TRIGGER checklist_modelos_updated_at BEFORE UPDATE ON public.checklist_modelos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.checklist_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.checklist_modelos(id) ON DELETE CASCADE,
  atividade_id uuid REFERENCES public.atividades(id) ON DELETE SET NULL,
  setor_id uuid REFERENCES public.setores(id),
  respostas jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  concluida boolean NOT NULL DEFAULT false,
  executado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_execucoes TO authenticated;
GRANT ALL ON public.checklist_execucoes TO service_role;
ALTER TABLE public.checklist_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver execucoes do setor" ON public.checklist_execucoes FOR SELECT TO authenticated
USING (public.is_direcao() OR executado_por = auth.uid() OR setor_id = public.meu_setor());
CREATE POLICY "Criar execucoes" ON public.checklist_execucoes FOR INSERT TO authenticated
WITH CHECK (executado_por = auth.uid());
CREATE POLICY "Atualizar execucoes proprias" ON public.checklist_execucoes FOR UPDATE TO authenticated
USING (public.is_direcao() OR executado_por = auth.uid())
WITH CHECK (public.is_direcao() OR executado_por = auth.uid());
CREATE POLICY "Chefe elimina execucoes" ON public.checklist_execucoes FOR DELETE TO authenticated
USING (public.is_chefe());
CREATE TRIGGER checklist_execucoes_updated_at BEFORE UPDATE ON public.checklist_execucoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();