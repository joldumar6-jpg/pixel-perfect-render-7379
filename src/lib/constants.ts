// Constantes do tema EMRICH INFRAESTRUTURAS

export const THEME = {
  background: '#FBF3DE',
  card: '#FFFDF7',
  border: '#EAD9A8',
  primary: '#f59e0b',
  primaryDark: '#d97706',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
  },
} as const;

export const SETORES_COLORS: Record<string, string> = {
  'Património': '#3b82f6',
  'Canalização': '#06b6d4',
  'Jardinagem': '#10b981',
  'Construção': '#f59e0b',
  'Serralharia': '#f97316',
  'Eletricidade': '#eab308',
  'Limpeza': '#14b8a6',
  'Marcenaria': '#ec4899',
};

export const NAV_ITEMS = {
  mobile: [
    { id: 'atividades', label: 'Atividades', icon: 'clipboard-list' },
    { id: 'varredura-ia', label: 'Varredura IA', icon: 'scan' },
    { id: 'sql', label: 'SQL', icon: 'database' },
  ],
  desktop: [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { id: 'atividades', label: 'Atividades', icon: 'clipboard-list' },
    { id: 'setores', label: 'Setores', icon: 'building-2' },
    { id: 'varredura-ia', label: 'Varredura IA', icon: 'scan' },
    { id: 'sql', label: 'SQL', icon: 'database' },
  ],
} as const;

export const TIPO_PERFIL_LABEL = {
  chefe: 'Chefe de Departamento',
  colaborador: 'Colaborador',
} as const;

// Identificadores UUID canónicos para o Chefe de Departamento
export const CHEFE_MASTER_UUID = '00000000-0000-4000-a000-000000000001';
export const CHEFE_PERFIL_UUID = '00000000-0000-4000-a000-000000000002';

export const isValidUUID = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const toValidUUID = (
  id: string | null | undefined,
  fallback: string = CHEFE_MASTER_UUID
): string => {
  if (isValidUUID(id)) return id!;
  return fallback;
};
