
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { gerarRelatorioIA } from '@/lib/ai.functions';
import { Scan, Lock, Copy, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface AIRecommendation {
  setor: string;
  desempenho: number;
  gargalos: string[];
  recomendacao: string;
}

interface AIReport {
  resumo: string;
  taxaGlobal: number;
  setores: AIRecommendation[];
  gargalosCriticos: string[];
  recomendacoes: string[];
  generatedAt: string;
}

export function AIScanPanel() {
  const { isChefe, perfil } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<AIReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Bloquear acesso para colaboradores
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
          A Varredura IA é uma funcionalidade exclusiva do Chefe de Departamento.
          Apenas <span className="text-amber-400 font-medium">{perfil?.nome}</span> pode
          acessar esta ferramenta para gerar relatórios executivos.
        </p>
      </div>
    );
  }

  const handleScan = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await gerarRelatorioIA();
      setReport(data);
    } catch (err) {
      console.error('Scan error:', err);
      setError('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = () => {
    if (!report) return;

    const text = `
═══════════════════════════════════════════════════════════
       EMRICH INFRAESTRUTURAS - RELATÓRIO EXECUTIVO IA
═══════════════════════════════════════════════════════════

Gerado em: ${new Date(report.generatedAt).toLocaleString('pt-BR')}
Responsável: ${perfil?.nome}

───────────────────────────────────────────────────────────
RESUMO EXECUTIVO
───────────────────────────────────────────────────────────

${report.resumo}

Taxa Global de Execução: ${report.taxaGlobal}%

───────────────────────────────────────────────────────────
DESEMPENHO POR SETOR
───────────────────────────────────────────────────────────

${report.setores.map(s => `
[${s.setor}]
• Desempenho: ${s.desempenho}%
• Gargalos: ${s.gargalos.length > 0 ? s.gargalos.join(', ') : 'Nenhum'}
• Recomendação: ${s.recomendacao}
`).join('\n')}

───────────────────────────────────────────────────────────
GARGALOS CRÍTICOS
───────────────────────────────────────────────────────────

${report.gargalosCriticos.map(g => `• ${g}`).join('\n')}

───────────────────────────────────────────────────────────
RECOMENDAÇÕES ESTRATÉGICAS
───────────────────────────────────────────────────────────

${report.recomendacoes.map((r, i) => `${i + 1}. ${r}`).join('\n')}

═══════════════════════════════════════════════════════════
                    EMRICH INFRAESTRUTURAS
        Departamento de Infraestruturas - ${perfil?.nome}
═══════════════════════════════════════════════════════════
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Varredura IA</h1>
          <p className="text-slate-400 text-sm mt-1">
            Análise inteligente do desempenho departamental
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Chefe</span>
        </div>
      </div>

      {/* Scan Button */}
      {!report && (
        <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-400/10 flex items-center justify-center mx-auto mb-4">
            <Scan className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">
            Iniciar Varredura IA
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Analise automaticamente todas as atividades dos 8 setores, identifique
            gargalos críticos e receba recomendações estratégicas personalizadas.
          </p>
          <button
            onClick={handleScan}
            disabled={isLoading}
            className="px-6 py-3 bg-amber-400 text-slate-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                A analisar...
              </>
            ) : (
              <>
                <Scan className="w-5 h-5" />
                Iniciar Varredura
              </>
            )}
          </button>
          {error && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </button>
            <button
              onClick={handleScan}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400/10 text-amber-400 rounded-lg hover:bg-amber-400/20 transition-colors disabled:opacity-50"
            >
              <Scan className="w-4 h-4" />
              Nova Análise
            </button>
          </div>

          {/* Report Content */}
          <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-6 print:border-0 print:bg-white print:text-black">
            {/* Header */}
            <div className="text-center mb-8 print:mb-4">
              <h2 className="text-2xl font-bold text-amber-400 print:text-black">
                EMRICH INFRAESTRUTURAS
              </h2>
              <p className="text-slate-400 print:text-gray-600">Relatório Executivo IA</p>
              <p className="text-sm text-slate-500 print:text-gray-500 mt-1">
                Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')}
              </p>
            </div>

            {/* Taxa Global */}
            <div className="bg-slate-800/50 rounded-xl p-6 mb-6 text-center">
              <p className="text-sm text-slate-400 mb-2">Taxa Global de Execução</p>
              <p className={`text-5xl font-bold ${report.taxaGlobal >= 70 ? 'text-emerald-400' : report.taxaGlobal >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {report.taxaGlobal}%
              </p>
            </div>

            {/* Resumo */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Resumo Executivo
              </h3>
              <p className="text-slate-300 leading-relaxed">{report.resumo}</p>
            </div>

            {/* Setores */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">
                Desempenho por Setor
              </h3>
              <div className="grid gap-3">
                {report.setores.map((setor, i) => (
                  <div key={i} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-200">{setor.setor}</span>
                      <span className={`text-lg font-bold ${
                        setor.desempenho >= 70 ? 'text-emerald-400' :
                        setor.desempenho >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {setor.desempenho}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full ${
                          setor.desempenho >= 70 ? 'bg-emerald-400' :
                          setor.desempenho >= 40 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${setor.desempenho}%` }}
                      />
                    </div>
                    {setor.gargalos.length > 0 && (
                      <div className="text-sm text-slate-400">
                        <span className="text-amber-400 font-medium">Gargalos: </span>
                        {setor.gargalos.join(', ')}
                      </div>
                    )}
                    <div className="text-sm text-slate-300 mt-2">
                      <span className="text-emerald-400 font-medium">Recomendação: </span>
                      {setor.recomendacao}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gargalos Críticos */}
            {report.gargalosCriticos.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Gargalos Críticos
                </h3>
                <ul className="space-y-2">
                  {report.gargalosCriticos.map((gargalo, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300">
                      <span className="text-red-400">•</span>
                      {gargalo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recomendações */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-amber-400" />
                Recomendações Estratégicas
              </h3>
              <ol className="space-y-2">
                {report.recomendacoes.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-400 text-sm font-medium flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ol>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-slate-700/50">
              <p className="text-sm text-slate-500">
                Departamento de Infraestruturas - EMRICH
              </p>
              <p className="text-sm text-slate-500">
                Responsável: {perfil?.nome}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
