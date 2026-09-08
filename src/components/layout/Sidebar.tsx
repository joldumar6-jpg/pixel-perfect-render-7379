
import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { perfilLabel } from '@/lib/perfis';
import {
  LayoutDashboard,
  ClipboardList,
  Database,
  Users,
} from 'lucide-react';

const desktopItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/atividades', label: 'Atividades', icon: ClipboardList },
  { href: '/utilizadores', label: 'Utilizadores', icon: Users, requiresChefe: true },
  { href: '/sql', label: 'SQL', icon: Database, requiresChefe: true },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isChefe, perfil, logout } = useAuth();

  const items = desktopItems.filter(item => !item.requiresChefe || isChefe);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-[#FFFDF7] border-r border-[#EAD9A8] z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[#EAD9A8]">
        <h1 className="text-xl font-bold text-amber-400">EMRICH</h1>
        <p className="text-sm text-slate-400">Infraestruturas</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-amber-400/10 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-[#EAD9A8] space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-400 font-bold">
              {perfil?.nome?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">
              {perfil?.nome || 'Usuário'}
            </p>
            <p className="text-xs text-amber-400 font-medium truncate">
              {perfilLabel(perfil?.tipo_perfil)}
            </p>
          </div>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
            title="Sair"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Setor Indicator */}
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
          <span className="text-slate-500 font-medium">Setor: </span>
          <span className="text-slate-200 font-medium">
            {isChefe ? 'Todos (Direção Geral)' : (perfil?.setores?.nome || 'Setor Restrito')}
          </span>
          {!isChefe && (
            <p className="text-[10px] text-amber-400/80 mt-0.5">🔒 Acesso exclusivo ao seu setor</p>
          )}
        </div>
      </div>
    </aside>
  );
}
