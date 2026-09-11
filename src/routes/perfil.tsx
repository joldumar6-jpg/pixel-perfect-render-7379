import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { perfilLabel } from '@/lib/perfis';
import { UserCircle, Save } from 'lucide-react';

const inputCls =
  'w-full rounded-lg bg-[#FBF3DE] border border-[#EAD9A8] px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400';

function PerfilPage() {
  const { user, perfil, refreshPerfil } = useAuth();
  const [nome, setNome] = useState('');
  const [setorId, setSetorId] = useState('');
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome ?? '');
      setSetorId(perfil.setor_id ?? '');
    }
  }, [perfil]);

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: async () => {
      const { data } = await supabase.from('setores').select('id, nome').order('nome');
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setMensagem(null);
    setAGuardar(true);
    try {
      const existente = perfil?.id && perfil.id !== user.id;
      if (existente) {
        // A função hierárquica nunca é alterada aqui: só o Chefe de Departamento a define.
        const { error } = await supabase
          .from('perfis')
          .update({ nome: nome.trim(), setor_id: setorId || null } as never)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('perfis').insert({
          user_id: user.id,
          nome: nome.trim(),
          email: user.email,
          setor_id: setorId || null,
        } as never);
        if (error) throw error;
      }
      await refreshPerfil();
      setMensagem({ tipo: 'ok', texto: 'Dados guardados.' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível guardar.' });
    } finally {
      setAGuardar(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <UserCircle className="w-6 h-6 text-amber-400" /> O Meu Perfil
        </h1>
        <p className="text-sm text-slate-400">Atualize os seus dados pessoais.</p>
      </header>

      {mensagem && (
        <div className={`rounded-lg px-4 py-3 text-sm ${mensagem.tipo === 'ok' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={guardar} className="space-y-4 rounded-xl border border-[#EAD9A8] bg-[#FFFDF7] p-5">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Nome completo</label>
          <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Email</label>
          <input className={`${inputCls} opacity-70`} value={user?.email ?? ''} readOnly />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Setor</label>
          <select className={inputCls} value={setorId} onChange={(e) => setSetorId(e.target.value)}>
            <option value="">Sem setor</option>
            {setores.map((s) => (<option key={s.id} value={s.id}>{s.nome}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Função</label>
          <p className="rounded-lg bg-[#FBF3DE] border border-[#EAD9A8] px-3 py-2 text-slate-300">
            {perfilLabel(perfil?.tipo_perfil)}
          </p>
          <p className="text-xs text-slate-500 mt-1">A função só pode ser alterada pelo Chefe de Departamento.</p>
        </div>
        <button type="submit" disabled={aGuardar} className="flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50">
          <Save className="w-4 h-4" /> {aGuardar ? 'A guardar...' : 'Guardar'}
        </button>
      </form>
    </div>
  );
}

const TITLE = 'O Meu Perfil — EMRICH Infraestruturas';
const DESCRIPTION = 'Consulte e atualize os seus dados pessoais e o setor a que pertence.';

export const Route = createFileRoute('/perfil')({
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
        <PerfilPage />
      </AppLayout>
    </RequireAuth>
  ),
});
