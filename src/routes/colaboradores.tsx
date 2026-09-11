import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { AppLayout } from '@/components/layout';
import { supabase } from '@/integrations/supabase/client';
import { perfilLabel } from '@/lib/perfis';
import { Users } from 'lucide-react';

interface ColaboradorLinha {
  id: string;
  nome: string;
  email: string;
  tipo_perfil: string;
  setores?: { nome: string; cor: string } | null;
}

const ORDEM = ['chefe', 'diretor', 'chefe_setor', 'colaborador'];

function ColaboradoresPage() {
  const { data: pessoas = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, email, tipo_perfil, setores(nome, cor)')
        .order('nome');
      if (error) throw error;
      return (data ?? []) as unknown as ColaboradorLinha[];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Users className="w-6 h-6 text-amber-400" /> Colaboradores
        </h1>
        <p className="text-sm text-slate-400">A equipa organizada por função hierárquica.</p>
      </header>

      {isLoading ? (
        <p className="text-slate-400">A carregar...</p>
      ) : (
        ORDEM.map((funcao) => {
          const grupo = pessoas.filter((p) => p.tipo_perfil === funcao);
          if (grupo.length === 0) return null;
          return (
            <section key={funcao} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400">
                {perfilLabel(funcao)} · {grupo.length}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.map((p) => (
                  <article key={p.id} className="rounded-xl border border-[#EAD9A8] bg-[#FFFDF7] p-4 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold">
                      {p.nome.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100 truncate">{p.nome}</p>
                      <p className="text-xs text-slate-500 truncate">{p.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.setores?.nome ?? 'Sem setor'}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })
      )}

      {!isLoading && pessoas.length === 0 && (
        <p className="rounded-xl border border-[#EAD9A8] bg-[#FFFDF7] p-6 text-slate-400">Ainda não há colaboradores visíveis para si.</p>
      )}
    </div>
  );
}

const TITLE = 'Colaboradores — EMRICH Infraestruturas';
const DESCRIPTION = 'Veja a equipa do departamento organizada por função e setor.';

export const Route = createFileRoute('/colaboradores')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppLayout>
        <ColaboradoresPage />
      </AppLayout>
    </RequireAuth>
  ),
});
