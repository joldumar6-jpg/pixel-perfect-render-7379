
import { useState, useEffect } from 'react';
import { Atividade, Setor, Criticidade } from '@/lib/types';
import { X } from 'lucide-react';

interface ActivityFormProps {
  atividade?: Atividade | undefined;
  setores: Setor[];
  defaultSetorId?: string | undefined;
  onSubmit: (data: {
    titulo: string;
    descricao?: string | undefined;
    setor_id: string;
    criticidade: Criticidade;
    data_atividade: string;
    localizacao?: string | undefined;
  }) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
  isLoading?: boolean;
}

export function ActivityForm({
  atividade,
  setores,
  defaultSetorId,
  onSubmit,
  onClose,
  isLoading = false,
}: ActivityFormProps) {
  const [titulo, setTitulo] = useState(atividade?.titulo || '');
  const [descricao, setDescricao] = useState(atividade?.descricao || '');
  const initialSetorId = atividade?.setor_id || defaultSetorId || (setores.length === 1 ? setores[0]!.id : '');
  const [setorId, setSetorId] = useState(initialSetorId);
  const [criticidade, setCriticidade] = useState<Criticidade>(atividade?.criticidade || 'media');
  const [dataAtividade, setDataAtividade] = useState(
    atividade?.data_atividade || new Date().toISOString().slice(0, 10)
  );
  const [localizacao, setLocalizacao] = useState(atividade?.localizacao || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setorId && (defaultSetorId || (setores.length === 1 ? setores[0]!.id : ''))) {
      setSetorId(defaultSetorId || (setores.length === 1 ? setores[0]!.id : ''));
    }
  }, [defaultSetorId, setores, setorId]);

  const isEditing = !!atividade;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!titulo.trim()) {
      setError('O título é obrigatório');
      return;
    }
    if (!setorId) {
      setError('O setor é obrigatório');
      return;
    }

    const result = await onSubmit({
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      setor_id: setorId as string,
      criticidade,
      data_atividade: dataAtividade,
      localizacao: localizacao.trim() || undefined,
    });

    if (!result.success) {
      setError(result.error || 'Erro ao guardar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[#FFFDF7] rounded-t-2xl md:rounded-2xl border border-[#EAD9A8] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#EAD9A8]">
          <h2 className="text-lg font-semibold text-slate-100">
            {isEditing ? 'Editar Atividade' : 'Nova Atividade'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Descreva a atividade"
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 resize-none"
            />
          </div>

          {/* Setor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-300">
                Setor *
              </label>
              {setores.length === 1 && (
                <span className="text-[11px] font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Acesso exclusivo ao seu setor
                </span>
              )}
            </div>
            <select
              value={setorId}
              onChange={(e) => setSetorId(e.target.value)}
              disabled={setores.length === 1}
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 disabled:opacity-80 disabled:cursor-not-allowed"
            >
              {setores.length > 1 && <option value="">Selecione um setor</option>}
              {setores.map((setor) => (
                <option key={setor.id} value={setor.id}>
                  {setor.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Criticidade */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Criticidade *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['baixa', 'media', 'alta', 'critica'] as Criticidade[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCriticidade(c)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    criticidade === c
                      ? c === 'baixa'
                        ? 'bg-slate-400/20 border-slate-400 text-slate-300'
                        : c === 'media'
                        ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                        : c === 'alta'
                        ? 'bg-orange-400/20 border-orange-400 text-orange-400'
                        : 'bg-red-400/20 border-red-400 text-red-400'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Data e Localização */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Data *
              </label>
              <input
                type="date"
                value={dataAtividade}
                onChange={(e) => setDataAtividade(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Localização
              </label>
              <input
                type="text"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                placeholder="Local"
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[#EAD9A8] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-amber-400 text-slate-900 font-medium hover:bg-amber-500 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'A guardar...' : isEditing ? 'Guardar' : 'Criar Atividade'}
          </button>
        </div>
      </div>
    </div>
  );
}
