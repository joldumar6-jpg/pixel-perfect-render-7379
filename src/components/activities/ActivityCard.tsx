
import { useState } from 'react';
import { cn, formatDate } from '@/lib/utils';
import { Atividade, ESTADO_CONFIG, CRITICIDADE_CONFIG } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import {
  Building,
  Droplets,
  Trees,
  HardHat,
  Wrench,
  Zap,
  SprayCan,
  Sofa,
  MapPin,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'building': Building,
  'droplets': Droplets,
  'trees': Trees,
  'hard-hat': HardHat,
  'wrench': Wrench,
  'zap': Zap,
  'spray-can': SprayCan,
  'sofa': Sofa,
};

interface ActivityCardProps {
  atividade: Atividade;
  onEdit?: ((atividade: Atividade) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  onUpdateEstado?: ((id: string, estado: Atividade['estado']) => void) | undefined;
}

export function ActivityCard({ atividade, onEdit, onDelete, onUpdateEstado }: ActivityCardProps) {
  const { isChefe } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const setor = atividade.setores;
  const Icon = setor?.icone ? iconMap[setor.icone] || Building : Building;

  const estadoConfig = ESTADO_CONFIG[atividade.estado];
  const criticidadeConfig = CRITICIDADE_CONFIG[atividade.criticidade];

  return (
    <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] overflow-hidden hover:border-slate-600 transition-colors">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Setor Badge */}
          <div className="flex items-center gap-2">
            {setor && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${setor.cor}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: setor.cor }} />
              </div>
            )}
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{
                backgroundColor: `${setor?.cor || '#64748b'}20`,
                color: setor?.cor || '#94a3b8',
              }}
            >
              {setor?.nome || 'Sem setor'}
            </span>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 min-w-[140px]">
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit(atividade);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                  )}
                  {isChefe && onDelete && (
                    <button
                      onClick={() => {
                        onDelete(atividade.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-3 font-semibold text-slate-100 line-clamp-2">
          {atividade.titulo}
        </h3>

        {/* Description */}
        {atividade.descricao && (
          <p className="mt-2 text-sm text-slate-400 line-clamp-2">
            {atividade.descricao}
          </p>
        )}

        {/* Meta Info */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          {atividade.localizacao && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {atividade.localizacao}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(atividade.data_atividade)}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', estadoConfig.bgCor, estadoConfig.cor)}>
          {atividade.estado === 'pendente' && <Clock className="w-3 h-3 inline mr-1" />}
          {atividade.estado === 'em_curso' && <Clock className="w-3 h-3 inline mr-1" />}
          {atividade.estado === 'concluido' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
          {estadoConfig.label}
        </span>
        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', criticidadeConfig.bgCor, criticidadeConfig.cor)}>
          {atividade.criticidade === 'critica' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
          {criticidadeConfig.label}
        </span>
      </div>

      {/* Quick Actions */}
      {onUpdateEstado && (
        <div className="px-4 pb-4 flex gap-2">
          {atividade.estado !== 'em_curso' && (
            <button
              onClick={() => onUpdateEstado(atividade.id, 'em_curso')}
              className="flex-1 text-xs font-medium py-2 rounded-lg bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition-colors"
            >
              Iniciar
            </button>
          )}
          {atividade.estado !== 'concluido' && (
            <button
              onClick={() => onUpdateEstado(atividade.id, 'concluido')}
              className="flex-1 text-xs font-medium py-2 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors"
            >
              Concluir
            </button>
          )}
        </div>
      )}
    </div>
  );
}
