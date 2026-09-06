
import { ReactNode, useState } from 'react';
import { BottomBar } from './BottomBar';
import { Sidebar } from './Sidebar';
import { MobileNavDrawer } from './MobileNavDrawer';
import { OnlineStatus } from './OnlineStatus';
import { useAuth } from '@/hooks/useAuth';
import { Menu, Building2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { perfil, isChefe } = useAuth();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      {/* Top Mobile Bar com Botão do Menu Sanduíche */}
      <header className="md:hidden sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur border-b border-[#1e293b] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Botão Menu Sanduíche */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/70 text-slate-200 hover:text-amber-400 hover:bg-slate-800 transition-colors"
            title="Abrir menu sanduíche"
            aria-label="Abrir menu sanduíche"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-amber-400 text-base tracking-wider">EMRICH</span>
          </div>
        </div>

        {/* Identificação do Usuário e Setor */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
              {perfil?.nome?.split(' ')[0] || 'Utilizador'}
            </p>
            <p className="text-[10px] text-amber-400 truncate max-w-[120px]">
              {isChefe ? 'Direção Geral' : (perfil?.setores?.nome || 'Setor')}
            </p>
          </div>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-xs"
            title="Ver menu do perfil"
          >
            {perfil?.nome?.charAt(0) || 'U'}
          </button>
        </div>
      </header>

      {/* Menu Sanduíche Deslizante */}
      <MobileNavDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="md:ml-64 pb-20 md:pb-0 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <BottomBar />

      {/* Online Status Indicator */}
      <OnlineStatus />
    </div>
  );
}
