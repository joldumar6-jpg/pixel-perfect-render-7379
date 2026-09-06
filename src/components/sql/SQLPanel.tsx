
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Database, Lock, Copy, CheckCircle } from 'lucide-react';

const SQL_SCHEMA = `-- =====================================================
-- EMRICH INFRAESTRUTURAS - Schema SQL Completo
-- Banco de Dados: PostgreSQL / Supabase
-- =====================================================

-- ENUMs
CREATE TYPE tipo_perfil AS ENUM ('chefe', 'colaborador');
CREATE TYPE estado_atividade AS ENUM ('pendente', 'em_curso', 'concluido');
CREATE TYPE criticidade AS ENUM ('baixa', 'media', 'alta', 'critica');

-- =====================================================
-- TABELA: setores
-- =====================================================
CREATE TABLE setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    cor VARCHAR(7) NOT NULL,
    icone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: perfis
-- =====================================================
CREATE TABLE perfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    tipo_perfil tipo_perfil NOT NULL DEFAULT 'colaborador',
    setor_id UUID REFERENCES setores(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: atividades
-- =====================================================
CREATE TABLE atividades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setor_id UUID NOT NULL REFERENCES setores(id),
    responsavel_id UUID REFERENCES perfis(id),
    titulo VARCHAR(300) NOT NULL,
    descricao TEXT,
    estado estado_atividade NOT NULL DEFAULT 'pendente',
    criticidade criticidade NOT NULL DEFAULT 'media',
    data_atividade DATE NOT NULL DEFAULT CURRENT_DATE,
    localizacao VARCHAR(255),
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: historico_atividades
-- =====================================================
CREATE TABLE historico_atividades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atividade_id UUID NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    estado_anterior estado_atividade,
    estado_novo estado_atividade NOT NULL,
    observacao TEXT,
    data_alteracao TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: relatorios_executivos_ia
-- =====================================================
CREATE TABLE relatorios_executivos_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo_mes INTEGER NOT NULL CHECK (periodo_mes >= 1 AND periodo_mes <= 12),
    periodo_ano INTEGER NOT NULL CHECK (periodo_ano >= 2020),
    gerado_por UUID NOT NULL,
    taxa_global DECIMAL(5,2),
    dados_setores JSONB,
    conteudo_completo TEXT,
    data_geracao TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_executivos_ia ENABLE ROW LEVEL SECURITY;

-- Políticas para SETORES
CREATE POLICY "setores_select" ON setores FOR SELECT USING (true);
CREATE POLICY "setores_all_chefe" ON setores FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND tipo_perfil = 'chefe')
);

-- Políticas para PERFIS
CREATE POLICY "perfis_select_own" ON perfis FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND tipo_perfil = 'chefe')
);
CREATE POLICY "perfis_insert_chefe" ON perfis FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND tipo_perfil = 'chefe')
);
CREATE POLICY "perfis_update_own" ON perfis FOR UPDATE USING (user_id = auth.uid());

-- Políticas para ATIVIDADES
CREATE POLICY "atividades_select_chefe" ON atividades FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND tipo_perfil = 'chefe')
);
CREATE POLICY "atividades_select_colaborador" ON atividades FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND perfis.setor_id = atividades.setor_id)
);
CREATE POLICY "atividades_insert_auth" ON atividades FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "atividades_update_own_or_chefe" ON atividades FOR UPDATE USING (
    EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND tipo_perfil = 'chefe') OR
    EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND perfis.setor_id = atividades.setor_id)
);

-- Políticas para HISTORICO
CREATE POLICY "historico_select_related" ON historico_atividades FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND tipo_perfil = 'chefe') OR
    EXISTS (SELECT 1 FROM atividades WHERE atividades.id = historico_atividades.atividade_id
            AND EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND perfis.setor_id = atividades.setor_id))
);
CREATE POLICY "historico_insert_auth" ON historico_atividades FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para RELATÓRIOS IA (Apenas Chefes)
CREATE POLICY "relatorios_ia_select_chefe" ON relatorios_executivos_ia FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND tipo_perfil = 'chefe')
);
CREATE POLICY "relatorios_ia_all_chefe" ON relatorios_executivos_ia FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE user_id = auth.uid() AND tipo_perfil = 'chefe')
);`;

const TABS = [
  { id: 'schema', label: 'Schema' },
  { id: 'rls', label: 'Políticas RLS' },
  { id: 'correcao', label: 'Correção Permissões (meu_setor)' },
  { id: 'data', label: 'Dados' },
];

const CORRECAO_SQL = `-- =====================================================
-- CORREÇÃO DE PERMISSÕES PARA FUNÇÕES DE RLS
-- Resolve o erro: permission denied for function meu_setor (42501)
-- =====================================================

-- Conceder permissão de execução para usuários autenticados nas funções de verificação
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_chefe() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_direcao() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.meu_setor() TO authenticated, service_role;

-- Atualizar política de leitura na tabela de perfis
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
);`;

const DATA_SQL = `-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir os 8 Setores Oficiais
INSERT INTO setores (nome, descricao, cor, icone) VALUES
('Património', 'Auditoria e salvaguarda de ativos', '#3b82f6', 'building'),
('Canalização', 'Redes de água, pluvial e saneamento', '#06b6d4', 'droplets'),
('Jardinagem', 'Manutenção paisagística e áreas verdes', '#10b981', 'trees'),
('Construção', 'Alvenaria, obras civis e impermeabilização', '#f59e0b', 'hard-hat'),
('Serralharia', 'Estruturas metálicas e soldaduras', '#f97316', 'wrench'),
('Eletricidade', 'Redes BT/MT, transformadores e iluminação', '#eab308', 'zap'),
('Limpeza', 'Higienização predial e salubridade', '#14b8a6', 'spray-can'),
('Marcenaria', 'Mobiliário corporativo e divisórias', '#ec4899', 'sofa');

-- Criar perfil do Chefe (após criar usuário no Auth)
-- INSERT INTO perfis (user_id, nome, email, tipo_perfil, setor_id)
-- VALUES ('user-uuid-aqui', 'Oldumar Julio', 'oldumar@emrich.com', 'chefe', NULL);

-- Exemplo de atividade
-- INSERT INTO atividades (setor_id, titulo, descricao, estado, criticidade, created_by)
-- VALUES ('setor-uuid-aqui', 'Manutenção preventiva', 'Revisão geral do sistema', 'pendente', 'media', 'user-uuid-aqui');`;

const RLS_SQL = `-- =====================================================
-- Row Level Security - Políticas Detalhadas
-- =====================================================

-- 1. ATIVIDADES - Lógica de Acesso
-- =====================================================
-- Chefes: Veem e gerem TODAS as atividades
-- Colaboradores: Veem e gerem apenas atividades do SEU SETOR

-- SELECT: Combina duas políticas (OR)
-- A policy "atividades_select_chefe" permite chiefs ver tudo
-- A policy "atividades_select_colaborador" permite colaboradores ver setor deles

-- UPDATE/DELETE: Mesma lógica
-- Só chefes podem excluir qualquer atividade
-- Colaboradores podem atualizar apenas atividades do próprio setor

-- =====================================================
-- 2. RELATÓRIOS IA - Acesso Exclusivo
-- =====================================================
-- Apenas usuários com tipo_perfil = 'chefe' podem:
-- - Ver relatórios existentes
-- - Criar novos relatórios via API
-- - Eliminar relatórios

-- =====================================================
-- 3. PERFIS - Controle de Dados Pessoais
-- =====================================================
-- Cada usuário pode ver e atualizar apenas seu próprio perfil
-- Chefes podem ver todos os perfis
-- Somente chefes podem criar novos perfis

-- =====================================================
-- VERIFICAÇÃO DE ACESSO
-- =====================================================
-- A verificação é feita através da função auth.uid()
-- que retorna o ID do usuário autenticado atual

-- Exemplo de query segura:
-- SELECT * FROM atividades
-- WHERE setor_id IN (
--   SELECT setor_id FROM perfis WHERE user_id = auth.uid()
-- )
-- OR EXISTS (
--   SELECT 1 FROM perfis WHERE user_id = auth.uid() AND tipo_perfil = 'chefe'
-- )`;

export function SQLPanel() {
  const { isChefe, perfil } = useAuth();
  const [activeTab, setActiveTab] = useState('schema');
  const [copied, setCopied] = useState(false);

  if (!isChefe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-slate-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-200 mb-2">
          Acesso Restrito
        </h2>
        <p className="text-slate-400 max-w-md">
          A visualização do SQL e das políticas RLS é uma funcionalidade
          exclusiva do Chefe de Departamento.
        </p>
      </div>
    );
  }

  const content = {
    schema: SQL_SCHEMA,
    rls: RLS_SQL,
    correcao: CORRECAO_SQL,
    data: DATA_SQL,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content[activeTab as keyof typeof content]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Painel SQL</h1>
          <p className="text-slate-400 text-sm mt-1">
            Schema do banco de dados e políticas RLS
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Chefe</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#1e293b]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar
            </>
          )}
        </button>
      </div>

      {/* Code Block */}
      <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border-b border-[#1e293b]">
          <Database className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-mono">
            {activeTab === 'schema' && 'schema.sql'}
            {activeTab === 'rls' && 'rls_policies.sql'}
            {activeTab === 'data' && 'seed_data.sql'}
          </span>
        </div>
        <pre className="p-4 overflow-x-auto text-sm font-mono text-slate-300 max-h-[60vh] overflow-y-auto">
          <code>{content[activeTab as keyof typeof content]}</code>
        </pre>
      </div>
    </div>
  );
}
