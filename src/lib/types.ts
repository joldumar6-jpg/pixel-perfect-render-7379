// Tipos para EMRICH INFRAESTRUTURAS

export type TipoPerfil = 'chefe' | 'chefe_setor' | 'diretor' | 'colaborador';
export type EstadoAtividade = 'pendente' | 'em_curso' | 'concluido';
export type Criticidade = 'baixa' | 'media' | 'alta' | 'critica';

export interface Setor {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string | null;
  created_at: string;
}

export interface Perfil {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  tipo_perfil: TipoPerfil;
  setor_id: string | null;
  created_at: string;
  updated_at: string;
  setores?: Setor | null;
}

export interface Atividade {
  id: string;
  setor_id: string;
  responsavel_id: string | null;
  titulo: string;
  descricao: string | null;
  estado: EstadoAtividade;
  criticidade: Criticidade;
  data_atividade: string;
  localizacao: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  setores?: Setor | null;
  perfis?: Perfil | null;
}

export interface HistoricoAtividade {
  id: string;
  atividade_id: string;
  user_id: string;
  estado_anterior: EstadoAtividade | null;
  estado_novo: EstadoAtividade;
  observacao: string | null;
  data_alteracao: string;
  perfis?: Perfil | null;
}

export interface RelatorioExecutivoIA {
  id: string;
  periodo_mes: number;
  periodo_ano: number;
  gerado_por: string;
  taxa_global: number | null;
  dados_setores: Record<string, unknown> | null;
  conteudo_completo: string | null;
  data_geracao: string;
}

export interface MetricasAtividades {
  total: number;
  concluidas: number;
  em_andamento: number;
  pendentes: number;
  criticas: number;
  taxa_execucao: number;
}

export interface User {
  id: string;
  email: string;
  perfil?: Perfil;
}

// Dados dos 8 setores com UUIDs padronizados
export const SETORES_DATA = [
  { id: 'a0000000-0000-4000-8000-000000000001', slug: 'patrimonio', nome: 'Património', cor: '#3b82f6', icone: 'building' },
  { id: 'a0000000-0000-4000-8000-000000000002', slug: 'canalizacao', nome: 'Canalização', cor: '#06b6d4', icone: 'droplets' },
  { id: 'a0000000-0000-4000-8000-000000000003', slug: 'jardinagem', nome: 'Jardinagem', cor: '#10b981', icone: 'trees' },
  { id: 'a0000000-0000-4000-8000-000000000004', slug: 'construcao', nome: 'Construção', cor: '#f59e0b', icone: 'hard-hat' },
  { id: 'a0000000-0000-4000-8000-000000000005', slug: 'serralharia', nome: 'Serralharia', cor: '#f97316', icone: 'wrench' },
  { id: 'a0000000-0000-4000-8000-000000000006', slug: 'eletricidade', nome: 'Eletricidade', cor: '#eab308', icone: 'zap' },
  { id: 'a0000000-0000-4000-8000-000000000007', slug: 'limpeza', nome: 'Limpeza', cor: '#14b8a6', icone: 'spray-can' },
  { id: 'a0000000-0000-4000-8000-000000000008', slug: 'marcenaria', nome: 'Marcenaria', cor: '#ec4899', icone: 'sofa' },
] as const;

export const normalizeSetorId = (id: string | null | undefined): string => {
  if (!id) return SETORES_DATA[0].id;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  const match = SETORES_DATA.find(
    (s) => s.slug === id.toLowerCase() || s.nome.toLowerCase() === id.toLowerCase()
  );
  return match ? match.id : SETORES_DATA[0].id;
};

export const ESTADO_CONFIG: Record<EstadoAtividade, { label: string; cor: string; bgCor: string }> = {
  pendente: { label: 'Pendente', cor: 'text-amber-400', bgCor: 'bg-amber-400/10' },
  em_curso: { label: 'Em Curso', cor: 'text-blue-400', bgCor: 'bg-blue-400/10' },
  concluido: { label: 'Concluído', cor: 'text-emerald-400', bgCor: 'bg-emerald-400/10' },
};

export const CRITICIDADE_CONFIG: Record<Criticidade, { label: string; cor: string; bgCor: string }> = {
  baixa: { label: 'Baixa', cor: 'text-slate-400', bgCor: 'bg-slate-400/10' },
  media: { label: 'Média', cor: 'text-yellow-400', bgCor: 'bg-yellow-400/10' },
  alta: { label: 'Alta', cor: 'text-orange-400', bgCor: 'bg-orange-400/10' },
  critica: { label: 'Crítica', cor: 'text-red-400', bgCor: 'bg-red-400/10' },
};
