
import { cn } from '@/lib/utils';
import { Setor } from '@/lib/types';
import {
  Building,
  Droplets,
  Trees,
  HardHat,
  Wrench,
  Zap,
  SprayCan,
  Sofa,
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

interface SectorCarouselProps {
  setores: Setor[];
  selectedId?: string | undefined;
  onSelect: (id: string | undefined) => void;
  showAll?: boolean | undefined;
}

export function SectorCarousel({ setores, selectedId, onSelect, showAll = true }: SectorCarouselProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {showAll && (
        <button
          onClick={() => onSelect(undefined)}
          className={cn(
            'flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all',
            !selectedId
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
              : 'bg-[#0f172a] border-[#1e293b] text-slate-400 hover:border-slate-600'
          )}
        >
          <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center">
            <span className="text-lg font-bold">8</span>
          </div>
          <span className="text-xs font-medium whitespace-nowrap">Todos</span>
        </button>
      )}

      {setores.map((setor) => {
        const Icon = iconMap[setor.icone || 'building'] || Building;
        const isSelected = selectedId === setor.id;

        return (
          <button
            key={setor.id}
            onClick={() => onSelect(setor.id)}
            className={cn(
              'flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all',
              isSelected
                ? 'border-2'
                : 'bg-[#0f172a] border-[#1e293b] hover:border-slate-600'
            )}
            style={{
              borderColor: isSelected ? setor.cor : undefined,
              backgroundColor: isSelected ? `${setor.cor}15` : undefined,
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${setor.cor}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: setor.cor }} />
            </div>
            <span
              className="text-xs font-medium whitespace-nowrap"
              style={{ color: isSelected ? setor.cor : undefined }}
            >
              {setor.nome}
            </span>
          </button>
        );
      })}
    </div>
  );
}
