import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/layout/RequireAuth";

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useActivities } from '@/hooks/useActivities';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { SectorCarousel } from '@/components/dashboard/SectorCarousel';
import { ActivityCard, ActivityForm } from '@/components/activities';
import { Atividade, EstadoAtividade, Criticidade } from '@/lib/types';
import {
  Search,
  Plus,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Filter,
  X,
} from 'lucide-react';

function AtividadesPage() {
  const { setor: setorParam } = Route.useSearch();
  const { perfil, isChefe } = useAuth();
  const {
    atividades,
    setores,
    isLoading,
    metricas,
    createAtividade,
    updateAtividade,
    updateEstado,
    deleteAtividade,
  } = useActivities();

  const [search, setSearch] = useState('');
  const [selectedSetor, setSelectedSetor] = useState<string | undefined>(setorParam);
  const [filterEstado, setFilterEstado] = useState<EstadoAtividade | undefined>();
  const [filterCriticidade, setFilterCriticidade] = useState<Criticidade | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  // Filter activities
  const filteredAtividades = useMemo(() => {
    return atividades.filter((a) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !a.titulo.toLowerCase().includes(searchLower) &&
          !a.descricao?.toLowerCase().includes(searchLower) &&
          !a.localizacao?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (selectedSetor && a.setor_id !== selectedSetor) return false;
      if (filterEstado && a.estado !== filterEstado) return false;
      if (filterCriticidade && a.criticidade !== filterCriticidade) return false;
      return true;
    });
  }, [atividades, search, selectedSetor, filterEstado, filterCriticidade]);

  const handleSubmit = async (data: Parameters<typeof createAtividade>[0]) => {
    if (editingAtividade) {
      const result = await updateAtividade(editingAtividade.id, data as unknown as Partial<Atividade>);
      if (result.success) {
        setShowForm(false);
        setEditingAtividade(undefined);
      }
      return result;
    }
    const result = await createAtividade(data);
    if (result.success) {
      setShowForm(false);
    }
    return result;
  };

  const handleEdit = (atividade: Atividade) => {
    setEditingAtividade(atividade);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja eliminar esta atividade?')) {
      await deleteAtividade(id);
    }
  };

  const handleUpdateEstado = async (id: string, estado: EstadoAtividade) => {
    await updateEstado(id, estado);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedSetor(undefined);
    setFilterEstado(undefined);
    setFilterCriticidade(undefined);
  };

  const hasActiveFilters = search || selectedSetor || filterEstado || filterCriticidade;

  return (
    <RequireAuth>
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Atividades</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isChefe ? 'Gestão de todas as atividades' : `Atividades do setor ${perfil?.setores?.nome || ''}`}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingAtividade(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-slate-900 font-medium rounded-lg hover:bg-amber-500 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nova Atividade</span>
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            title="Total"
            value={metricas.total}
            icon={ClipboardList}
            color="slate"
          />
          <MetricCard
            title="Concluídas"
            value={metricas.concluidas}
            icon={CheckCircle2}
            color="emerald"
          />
          <MetricCard
            title="Em Curso"
            value={metricas.em_andamento}
            icon={Clock}
            color="blue"
          />
          <MetricCard
            title="Taxa Execução"
            value={`${metricas.taxa_execucao}%`}
            icon={TrendingUp}
            color={metricas.taxa_execucao >= 70 ? 'emerald' : metricas.taxa_execucao >= 40 ? 'amber' : 'red'}
          />
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar atividades..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF7] border border-[#EAD9A8] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-lg border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                  : 'bg-[#FFFDF7] border-[#EAD9A8] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <div className="p-4 bg-[#FFFDF7] rounded-xl border border-[#EAD9A8] space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Estado</label>
                <div className="flex flex-wrap gap-2">
                  {(['pendente', 'em_curso', 'concluido'] as EstadoAtividade[]).map((e) => (
                    <button
                      key={e}
                      onClick={() => setFilterEstado(filterEstado === e ? undefined : e)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        filterEstado === e
                          ? 'bg-amber-400/20 border-amber-400/50 text-amber-400'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {e === 'pendente' && 'Pendente'}
                      {e === 'em_curso' && 'Em Curso'}
                      {e === 'concluido' && 'Concluído'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Criticidade</label>
                <div className="flex flex-wrap gap-2">
                  {(['baixa', 'media', 'alta', 'critica'] as Criticidade[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilterCriticidade(filterCriticidade === c ? undefined : c)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        filterCriticidade === c
                          ? c === 'critica'
                            ? 'bg-red-400/20 border-red-400/50 text-red-400'
                            : c === 'alta'
                            ? 'bg-orange-400/20 border-orange-400/50 text-orange-400'
                            : c === 'media'
                            ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400'
                            : 'bg-slate-400/20 border-slate-400/50 text-slate-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sector Carousel */}
        <SectorCarousel
          setores={setores}
          selectedId={selectedSetor}
          onSelect={setSelectedSetor}
          showAll={isChefe}
        />

        {/* Activities List */}
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-[#FFFDF7] rounded-xl border border-[#EAD9A8] animate-pulse" />
            ))}
          </div>
        ) : filteredAtividades.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-200 mb-2">
              {hasActiveFilters ? 'Nenhuma atividade encontrada' : 'Sem atividades'}
            </h3>
            <p className="text-slate-400 text-sm">
              {hasActiveFilters
                ? 'Tente ajustar os filtros ou criar uma nova atividade.'
                : 'Comece criando a primeira atividade do setor.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAtividades.map((atividade) => (
              <ActivityCard
                key={atividade.id}
                atividade={atividade}
                onEdit={handleEdit}
                onDelete={isChefe ? handleDelete : undefined}
                onUpdateEstado={handleUpdateEstado}
              />
            ))}
          </div>
        )}
      </div>

      {/* Activity Form Modal */}
      {showForm && (
        <ActivityForm
          atividade={editingAtividade}
          setores={setores}
          defaultSetorId={perfil?.setor_id ?? undefined}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingAtividade(undefined);
          }}
        />
      )}
    </AppLayout>
    </RequireAuth>
  );
}

export const Route = createFileRoute("/atividades")({
  validateSearch: (search: Record<string, unknown>): { setor?: string | undefined } => ({
    setor: typeof search['setor'] === "string" ? (search['setor'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Atividades — EMRICH Infraestruturas" },
      { name: "description", content: "Registe, filtre e acompanhe as atividades operacionais de cada setor." },
      { property: "og:title", content: "Atividades — EMRICH Infraestruturas" },
      { property: "og:description", content: "Registe, filtre e acompanhe as atividades operacionais de cada setor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AtividadesPage,
});
