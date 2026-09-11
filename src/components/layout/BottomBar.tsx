import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { BOTTOM_LINKS } from '@/lib/nav';

export function BottomBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="flex items-center justify-around bg-[#FFFDF7] border-t border-[#EAD9A8] px-2 py-2 safe-area-inset-bottom">
        {BOTTOM_LINKS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'text-amber-400 bg-amber-400/10'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
