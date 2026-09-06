import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  listarUtilizadores,
  criarUtilizador,
  atualizarUtilizador,
  redefinirPalavraPasse,
  eliminarUtilizador,
} from '@/lib/users.functions';
import { UserPlus, Trash2, KeyRound, Save } from 'lucide-react';

const PERFIS = [
  { value: 'chefe', label: 'Chefe de Departamento' },
  { value: 'diretor', label: 'Diretor(a)' },
  { value: 'chefe_setor', label: 'Chefe de Setor' },
  { value: 'colaborador', label: 'Colaborador' },
] as const;

const perfilLabel = (v: string) => PERFIS.find((p) => p.value === v)?.label ?? v;

interface SetorLite { id: string; nome: string }

function UtilizadoresPage() {
  const { perfil } = useAuth();
  const isChefe = perfil?.tipo_perfil === 'chefe';
  const queryClient = useQueryClient();

  const listar = useServerFn(listarUtilizadores);
  const criar = useServerFn(criarUtilizador);
  const atualizar = useServerFn(atualizarUtilizador);
  const redefinir = useServerFn(redefinirPalavraPasse);
  const eliminar = useServerFn(eliminarUtilizador);

  const [setores, setSetores] = useState<SetorLite[]>([]);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', password: '', tipo_perfil: 'colaborador', setor_id: '' });
  const [edicoes, setEdicoes] = useState<Record<string, { nome: string; tipo_perfil: string; setor_id: string }>>({});

  useEffect(() => {
    supabase
      .from('setores')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setSetores((data ?? []) as unknown as SetorLite[]));
  }, []);

  const { data: utilizadores = [], isLoading } = useQuery({
    queryKey: ['utilizadores'],
    queryFn: () => listar({}),
    enabled: isChefe,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['utilizadores'] });
  const erro = (e: unknown) => setMensagem({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Ocorreu um erro.' });

  const criarM = useMutation({
    mutationFn: (v: typeof form) => criar({ data: { ...v, setor_id: v.setor_id || null } }),
    onSuccess: () => {
      setMensagem({ tipo: 'ok', texto: 'Utilizador criado com sucesso.' });
      setForm({ nome: '', email: '', password: '', tipo_perfil: 'colaborador', setor_id: '' });
      refresh();
    },
    onError: erro,
  });

  const guardarM = useMutation({
    mutationFn: (v: { user_id: string; nome: string; tipo_perfil: string; setor_id: string | null }) => atualizar({ data: v }),
    onSuccess: () => {
      setMensagem({ tipo: 'ok', texto: 'Alterações guardadas.' });
      refresh();
    },
    onError: erro,
  });

  const eliminarM = useMutation({
    mutationFn: (user_id: string) => eliminar({ data: { user_id } }),
    onSuccess: () => {
      setMensagem({ tipo: 'ok', texto: 'Utilizador eliminado.' });
      refresh();
    },
    onError: erro,
  });

  const passeM = useMutation({
    mutationFn: (v: { user_id: string; password: string }) => redefinir({ data: v }),
    onSuccess: () => setMensagem({ tipo: 'ok', texto: 'Palavra-passe atualizada.' }),
    onError: erro,
  });

  if (!isChefe) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
          Esta área é reservada ao Chefe de Departamento.
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">Utilizadores</h1>
        <p className="text-slate-400 text-sm">Crie contas e defina o perfil de cada pessoa.</p>
      </header>

      {mensagem && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            mensagem.tipo === 'ok'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-500/10 text-red-300 border border-red-500/30'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-400 mb-4">
          <UserPlus className="w-5 h-5" /> Nova conta
        </h2>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setMensagem(null);
            criarM.mutate(form);
          }}
        >
          <input className={inputCls} placeholder="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <input className={inputCls} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className={inputCls} type="text" placeholder="Palavra-passe (mín. 6)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <select className={inputCls} value={form.tipo_perfil} onChange={(e) => setForm({ ...form, tipo_perfil: e.target.value })}>
            {PERFIS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select className={inputCls} value={form.setor_id} onChange={(e) => setForm({ ...form, setor_id: e.target.value })}>
            <option value="">Sem setor</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={criarM.isPending}
            className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {criarM.isPending ? 'A criar...' : 'Criar utilizador'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-semibold text-amber-400 mb-4">Utilizadores registados</h2>
        {isLoading ? (
          <p className="text-slate-400">A carregar...</p>
        ) : (
          <div className="space-y-3">
            {utilizadores.map((u) => {
              const ed = edicoes[u.user_id] ?? {
                nome: u.nome,
                tipo_perfil: u.tipo_perfil,
                setor_id: u.setor_id ?? '',
              };
              const setEd = (patch: Partial<typeof ed>) =>
                setEdicoes((prev) => ({ ...prev, [u.user_id]: { ...ed, ...patch } }));

              return (
                <div key={u.user_id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <div>
                    <input className={inputCls} value={ed.nome} onChange={(e) => setEd({ nome: e.target.value })} />
                    <p className="mt-1 text-xs text-slate-500">{u.email}</p>
                  </div>
                  <select className={inputCls} value={ed.tipo_perfil} onChange={(e) => setEd({ tipo_perfil: e.target.value })}>
                    {PERFIS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <select className={inputCls} value={ed.setor_id} onChange={(e) => setEd({ setor_id: e.target.value })}>
                    <option value="">Sem setor</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      title="Guardar"
                      onClick={() => {
                        setMensagem(null);
                        guardarM.mutate({ user_id: u.user_id, nome: ed.nome, tipo_perfil: ed.tipo_perfil, setor_id: ed.setor_id || null });
                      }}
                      className="rounded-lg bg-amber-400/10 p-2 text-amber-400 hover:bg-amber-400/20"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      title="Definir nova palavra-passe"
                      onClick={() => {
                        const pw = window.prompt(`Nova palavra-passe para ${u.nome}:`);
                        if (pw) {
                          setMensagem(null);
                          passeM.mutate({ user_id: u.user_id, password: pw });
                        }
                      }}
                      className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      title="Eliminar"
                      onClick={() => {
                        if (window.confirm(`Eliminar a conta de ${u.nome}?`)) {
                          setMensagem(null);
                          eliminarM.mutate(u.user_id);
                        }
                      }}
                      className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="md:col-span-4 text-xs text-slate-500">Perfil atual: {perfilLabel(u.tipo_perfil)}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export const Route = createFileRoute('/utilizadores')({
  head: () => ({
    meta: [
      { title: 'Utilizadores — EMRICH Infraestruturas' },
      { name: 'description', content: 'Crie contas de acesso e defina o perfil de cada colaborador, chefe de setor ou diretor.' },
      { property: 'og:title', content: 'Utilizadores — EMRICH Infraestruturas' },
      { property: 'og:description', content: 'Crie contas de acesso e defina o perfil de cada colaborador, chefe de setor ou diretor.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppLayout>
        <UtilizadoresPage />
      </AppLayout>
    </RequireAuth>
  ),
});
