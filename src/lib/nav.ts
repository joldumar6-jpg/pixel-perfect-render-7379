import {
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  FolderOpen,
  Users,
  UserCircle,
  FileBarChart,
  Upload,
  ListChecks,
  ScrollText,
  Scan,
  Database,
  type LucideIcon,
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresChefe?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/atividades', label: 'Atividades', icon: ClipboardList },
  { href: '/ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
  { href: '/repositorio', label: 'Repositório', icon: FolderOpen },
  { href: '/checklists', label: 'Listas de Verificação', icon: ListChecks },
  { href: '/colaboradores', label: 'Colaboradores', icon: Users },
  { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { href: '/importar-plano', label: 'Importar Plano', icon: Upload, requiresChefe: true },
  { href: '/perfil', label: 'O Meu Perfil', icon: UserCircle },
  { href: '/utilizadores', label: 'Utilizadores', icon: Users, requiresChefe: true },
  { href: '/auditoria', label: 'Auditoria', icon: ScrollText, requiresChefe: true },
  { href: '/varredura-ia', label: 'Varredura IA', icon: Scan, requiresChefe: true },
  { href: '/sql', label: 'SQL', icon: Database, requiresChefe: true },
];

// Barra inferior no telemóvel: apenas os atalhos essenciais.
export const BOTTOM_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/atividades', label: 'Atividades', icon: ClipboardList },
  { href: '/ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
  { href: '/repositorio', label: 'Ficheiros', icon: FolderOpen },
];
