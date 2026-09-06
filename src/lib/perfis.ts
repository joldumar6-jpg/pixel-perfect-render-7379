export const PERFIL_LABELS: Record<string, string> = {
  chefe: 'Chefe de Departamento',
  diretor: 'Diretor(a)',
  chefe_setor: 'Chefe de Setor',
  colaborador: 'Colaborador',
};

export function perfilLabel(tipo?: string | null): string {
  if (!tipo) return 'Utilizador';
  return PERFIL_LABELS[tipo] ?? tipo;
}
