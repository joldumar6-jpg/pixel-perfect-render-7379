
import { ReactNode } from 'react';
import { BottomBar, Sidebar } from './BottomBar';
import { OnlineStatus } from './OnlineStatus';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
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
