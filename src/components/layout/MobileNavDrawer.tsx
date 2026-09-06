import { useState, useEffect } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { perfilLabel } from '@/lib/perfis';
import {
  Menu,
  X,
  LayoutDashboard,
  ClipboardList,
  Users,
  Database,
  Scan,
  LogOut,
  Building2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/atividades', label: 'Atividades', icon: ClipboardList },
  { href: '/utilizadores', label: 'Utilizadores', icon: Users, requiresChefe: true },
  { href: '/varredura-ia', label: 'Varredura IA', icon: Scan, requiresChefe: true },
  { href: '/sql', label: 'Painel SQL', icon: Database, requiresChefe: true },
];

export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { perfil, isChefe, logout } = useAuth();

  const [tratamento, setTratamento] = useState<'Sr.' | 'Sra.' | 'Sr./Sra.'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('emrich_tratamento');
      if (saved === 'Sr.' || saved === 'Sra.' || saved === 'Sr./Sra.') {
        return saved;
      }
    }
    return 'Sr./Sra.';
  });

  const handleTratamento = (novo: 'Sr.' | 'Sra.' | 'Sr./Sra.') => {
    setTratamento(novo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('emrich_tratamento', novo);
    }
  };

  // Travar o scroll da página quando o menu sanduíche estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const items = navItems.filter((item) => !item.requiresChefe || isChefe);
  const cargo = perfilLabel(perfil?.tipo_perfil);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer deslizante */}
      <div
        className={cn(
          'fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-[#0f172a] border-r border-[#1e293b] z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de Navegação Sanduíche"
      >
        {/* Cabeçalho do Drawer com Logo e Botão Fechar */}
        <div className="flex items-center justify-between p-5 border-b border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-400 tracking-wider">EMRICH</h2>
              <p className="text-[11px] text-slate-400 -mt-0.5">Infraestruturas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title="Fechar menu sanduíche"
            aria-label="Fechar menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cartão de Informação do Utilizador */}
        <div className="p-4 border-b border-[#1e293b] bg-slate-900/50">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-400 font-bold text-lg">
                {perfil?.nome?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-amber-400 font-semibold">
                {tratamento}
              </p>
              <p className="text-sm font-bold text-slate-100 truncate">
                {perfil?.nome || 'Usuário'}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-400/15 border border-amber-400/30 text-amber-300">
                  {cargo}
                </span>
              </div>
            </div>
          </div>

          {/* Aviso do Setor e Restrição de Acesso */}
          <div className="mt-3.5 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              {isChefe ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
              <span className="truncate">
                {isChefe
                  ? 'Acesso Global: Departamento Geral'
                  : `Setor: ${perfil?.setores?.nome || 'Restrito'}`}
              </span>
            </div>
            {!isChefe && (
              <p className="text-[11px] text-amber-400/90 mt-1 font-medium">
                🔒 Acesso estrito apenas ao seu setor.
              </p>
            )}
          </div>

          {/* Seletor rápido de tratamento Sr. / Sra. */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Tratamento:</span>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-700/80">
              <button
                type="button"
                onClick={() => handleTratamento('Sr.')}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-semibold rounded transition-colors',
                  tratamento === 'Sr.' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Sr.
              </button>
              <button
                type="button"
                onClick={() => handleTratamento('Sra.')}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-semibold rounded transition-colors',
                  tratamento === 'Sra.' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Sra.
              </button>
              <button
                type="button"
                onClick={() => handleTratamento('Sr./Sra.')}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-semibold rounded transition-colors',
                  tratamento === 'Sr./Sra.' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                Ambos
              </button>
            </div>
          </div>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <p className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Navegação Principal
          </p>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all',
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-semibold shadow-md shadow-amber-400/10'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive ? 'text-slate-950' : 'text-amber-400/80')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Rodapé com Botão de Sair */}
        <div className="p-4 border-t border-[#1e293b] bg-slate-900/60">
          <button
            onClick={async () => {
              onClose();
              await logout();
            }}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </div>
    </>
  );
}
