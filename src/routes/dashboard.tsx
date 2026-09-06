import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/layout/RequireAuth";

import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useActivities } from '@/hooks/useActivities';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ActivityCard } from '@/components/activities';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

function DashboardPage() {
  const { perfil, isChefe } = useAuth();
  const { atividades, setores, isLoading, metricas } = useActivities();

  const atividadesCriticas = atividades.filter(
    a => a.criticidade === 'critica' && a.estado !== 'concluido'
  ).slice(0, 3);

  const atividadesRecentes = atividades.slice(0, 5);

  return (
    <RequireAuth>
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Bem-vindo, {perfil?.nome?.split(' ')[0] || 'Usuário'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isChefe
                ? 'Vista geral do Departamento de Infraestruturas'
                : `Gestão do setor ${perfil?.setores?.nome || ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400 font-medium">EMRICH</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
            title="Pendentes"
            value={metricas.pendentes}
            icon={Clock}
            color="amber"
          />
          <MetricCard
            title="Críticas"
            value={metricas.criticas}
            icon={AlertTriangle}
            color="red"
          />
          <MetricCard
            title="Taxa Execução"
            value={`${metricas.taxa_execucao}%`}
            icon={TrendingUp}
            color={metricas.taxa_execucao >= 70 ? 'emerald' : metricas.taxa_execucao >= 40 ? 'amber' : 'red'}
          />
        </div>

        {/* Performance Chart Placeholder */}
        <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Desempenho por Setor</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {setores.map((setor) => {
              const setorAtividades = atividades.filter(a => a.setor_id === setor.id);
              const concluidas = setorAtividades.filter(a => a.estado === 'concluido').length;
              const taxa = setorAtividades.length > 0
                ? Math.round((concluidas / setorAtividades.length) * 100)
                : 0;

              return (
                <div key={setor.id} className="text-center">
                  <div
                    className="text-2xl font-bold mb-1"
                    style={{ color: setor.cor }}
                  >
                    {taxa}%
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${taxa}%`, backgroundColor: setor.cor }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">{setor.nome}</p>
                  <p className="text-xs text-slate-500">{setorAtividades.length} atividades</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two Columns */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Critical Activities */}
          <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Atividades Críticas
              </h2>
              <Link
                to="/atividades"
                className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {atividadesCriticas.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                Nenhuma atividade crítica pendente
              </p>
            ) : (
              <div className="space-y-3">
                {atividadesCriticas.map((atividade) => (
                  <ActivityCard
                    key={atividade.id}
                    atividade={atividade}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent Activities */}
          <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Atividades Recentes
              </h2>
              <Link
                to="/atividades"
                className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {atividadesRecentes.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                Nenhuma atividade registada
              </p>
            ) : (
              <div className="space-y-3">
                {atividadesRecentes.map((atividade) => (
                  <ActivityCard
                    key={atividade.id}
                    atividade={atividade}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Setores Overview */}
        <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Visão Geral dos Setores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {setores.map((setor) => {
              const total = atividades.filter(a => a.setor_id === setor.id).length;

              return (
                <Link
                  key={setor.id}
                  to="/atividades"
                  search={{ setor: setor.id }}
                  className="p-4 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${setor.cor}20` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: setor.cor }}
                      />
                    </div>
                    <span className="font-medium text-slate-200 group-hover:text-amber-400 transition-colors">
                      {setor.nome}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-100">{total}</p>
                  <p className="text-xs text-slate-500">atividades</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
    </RequireAuth>
  );
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EMRICH Infraestruturas" },
      { name: "description", content: "Vista geral das atividades e do desempenho dos setores do Departamento de Infraestruturas." },
      { property: "og:title", content: "Dashboard — EMRICH Infraestruturas" },
      { property: "og:description", content: "Vista geral das atividades e do desempenho dos setores do Departamento de Infraestruturas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});
