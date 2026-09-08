import { useState, useEffect } from 'react';
import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/layout/RequireAuth";

import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useActivities } from '@/hooks/useActivities';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ActivityCard } from '@/components/activities';
import { perfilLabel } from '@/lib/perfis';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Building2,
  BadgeCheck,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

function DashboardPage() {
  const { perfil, isChefe } = useAuth();
  const { atividades, setores, isLoading, metricas } = useActivities();

  const [tratamento, setTratamento] = useState<'Sr.' | 'Sra.' | 'Sr./Sra.'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('emrich_tratamento');
      if (saved === 'Sr.' || saved === 'Sra.' || saved === 'Sr./Sra.') {
        return saved;
      }
    }
    return 'Sr./Sra.';
  });

  const handleTratamentoChange = (novo: 'Sr.' | 'Sra.' | 'Sr./Sra.') => {
    setTratamento(novo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('emrich_tratamento', novo);
    }
  };

  const cargoNome = perfilLabel(perfil?.tipo_perfil);

  const atividadesCriticas = atividades.filter(
    a => a.criticidade === 'critica' && a.estado !== 'concluido'
  ).slice(0, 3);

  const atividadesRecentes = atividades.slice(0, 5);

  return (
    <RequireAuth>
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFDF7]/70 border border-[#EAD9A8] p-5 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                Bem-vindo(a), {tratamento} {perfil?.nome || 'Usuário'}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/15 border border-amber-400/30 text-amber-300 shadow-sm">
                <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                {cargoNome}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-slate-300 font-medium">
                Cargo: <span className="text-amber-400 font-semibold">{cargoNome}</span>
              </span>
              <span className="text-slate-600">•</span>
              <span>
                {isChefe
                  ? 'Direção Geral do Departamento de Infraestruturas'
                  : perfil?.setores?.nome
                  ? `Setor: ${perfil.setores.nome}`
                  : 'Departamento de Infraestruturas'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            {/* Seletor de Tratamento Sr. / Sra. */}
            <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 text-xs shadow-inner">
              <span className="px-2 text-slate-400 font-medium text-[11px] hidden sm:inline">
                Tratamento:
              </span>
              <button
                type="button"
                onClick={() => handleTratamentoChange('Sr.')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all',
                  tratamento === 'Sr.'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                )}
                title="Definir tratamento como Senhor"
              >
                Sr.
              </button>
              <button
                type="button"
                onClick={() => handleTratamentoChange('Sra.')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all',
                  tratamento === 'Sra.'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                )}
                title="Definir tratamento como Senhora"
              >
                Sra.
              </button>
              <button
                type="button"
                onClick={() => handleTratamentoChange('Sr./Sra.')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all',
                  tratamento === 'Sr./Sra.'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                )}
                title="Definir tratamento como Sr./Sra."
              >
                Sr./Sra.
              </button>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-400/10 border border-amber-400/20 rounded-xl">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-400 font-bold tracking-wider">EMRICH</span>
            </div>
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
        <div className="bg-[#FFFDF7] rounded-xl border border-[#EAD9A8] p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-slate-200">
              {isChefe ? 'Desempenho por Setor (Geral)' : `Desempenho do Seu Setor: ${perfil?.setores?.nome || 'Atribuído'}`}
            </h2>
            {!isChefe && (
              <span className="text-xs px-2.5 py-1 bg-amber-400/10 border border-amber-400/25 text-amber-400 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Acesso restrito ao seu setor
              </span>
            )}
          </div>
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
          <div className="bg-[#FFFDF7] rounded-xl border border-[#EAD9A8] p-6">
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
          <div className="bg-[#FFFDF7] rounded-xl border border-[#EAD9A8] p-6">
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
        <div className="bg-[#FFFDF7] rounded-xl border border-[#EAD9A8] p-6">
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
