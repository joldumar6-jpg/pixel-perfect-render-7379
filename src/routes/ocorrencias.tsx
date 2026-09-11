import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { registarAcao } from '@/lib/audit';
import { CRITICIDADE_CONFIG, ESTADO_CONFIG, type Criticidade, type EstadoAtividade } from '@/lib/types';
import { AlertTriangle, Plus, Trash2, Search, ImagePlus } from 'lucide-react';

interface Ocorrencia {
  id: string;
  setor_id: string;
  atividade_id: string | null;
  responsavel_id: string | null;
  titulo: string;
  descricao: string | null;
  gravidade: Criticidade;
  estado: EstadoAtividade;
  localizacao: string | null;
  foto_url: string | null;
  data_ocorrencia: string;
  created_by: string;
  created_at: string;
  setores?: { nome: string; cor: string } | null;
  perfis?: { nome: string } | null;
}

const inputCls =
  'w-full rounded-lg bg-[#FBF3DE] border border-[#EAD9A8] px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400';

function OcorrenciasPage() {
  const { user, perfil, isChefe } = useAuth();
  const queryClient = useQueryClient();
  const [pesquisa, setPesquisa] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoAtividade>('todos');
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    gravidade: 'media' as Criticidade,
    localizacao: '',
    setor_id: '',
    responsavel_id: '',
    data_ocorrencia: new Date().toISOString().slice(0, 10),
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: async () => {
      const { data } = await supabase.from('setores').select('id, nome').order('nome');
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const { data: colegas = [] } = useQuery({
    queryKey: ['perfis-lite'],
    queryFn: async () => {
      const { data } = await supabase.from('perfis').select('id, nome').order('nome');
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const { data: ocorrencias = [], isLoading } = useQuery({
    queryKey: ['ocorrencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ocorrencias')
        .select('*, setores(nome, cor), perfis(nome)')
        .order('data_ocorrencia', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Ocorrencia[];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sessão expirada.');
      const setorId = form.setor_id || perfil?.setor_id;
      if (!setorId) throw new Error('Escolha o setor da ocorrência.');

      let fotoUrl: string | null = null;
      if (ficheiro) {
        const caminho = `${user.id}/ocorrencias/${Date.now()}-${ficheiro.name}`;
        const { error: upErr } = await supabase.storage.from('documentos').upload(caminho, ficheiro);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from('documentos').createSignedUrl(caminho, 60 * 60 * 24 * 365);
        fotoUrl = signed?.signedUrl ?? null;
      }

      const { data, error } = await supabase
        .from('ocorrencias')
        .insert({
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || null,
          gravidade: form.gravidade,
          localizacao: form.localizacao.trim() || null,
          setor_id: setorId,
          responsavel_id: form.responsavel_id || null,
          data_ocorrencia: form.data_ocorrencia,
          foto_url: fotoUrl,
          created_by: user.id,
        } as never)
        .select('id')
        .single();
      if (error) throw error;
      await registarAcao({
        userId: user.id,
        userNome: perfil?.nome,
        acao: 'criou',
        entidade: 'ocorrencia',
        entidadeId: (data as { id: string }).id,
        detalhes: { titulo: form.titulo },
      });
    },
    onSuccess: () => {
      setAberto(false);
      setFicheiro(null);
      setForm({ ...form, titulo: '', descricao: '', localizacao: '', responsavel_id: '' });
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível registar.'),
  });

  const mudarEstado = useMutation({
    mutationFn: async (v: { id: string; estado: EstadoAtividade }) => {
      const { error } = await supabase.from('ocorrencias').update({ estado: v.estado } as never).eq('id', v.id);
      if (error) throw error;
      if (user) {
        await registarAcao({
          userId: user.id,
          userNome: perfil?.nome,
          acao: 'alterou estado',
          entidade: 'ocorrencia',
          entidadeId: v.id,
          detalhes: { estado: v.estado },
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ocorrencias'] }),
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível atualizar.'),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ocorrencias').delete().eq('id', id);
      if (error) throw error;
      if (user) {
        await registarAcao({ userId: user.id, userNome: perfil?.nome, acao: 'eliminou', entidade: 'ocorrencia', entidadeId: id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ocorrencias'] }),
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível eliminar.'),
  });

  const lista = ocorrencias.filter((o) => {
    const okEstado = filtroEstado === 'todos' || o.estado === filtroEstado;
    const termo = pesquisa.trim().toLowerCase();
    const okTermo = !termo || o.titulo.toLowerCase().includes(termo) || (o.descricao ?? '').toLowerCase().includes(termo);
    return okEstado && okTermo;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" /> Ocorrências
          </h1>
          <p className="text-sm text-slate-400">Problemas registados no terreno e o seu acompanhamento.</p>
        </div>
        <button
          onClick={() => { setErro(null); setAberto((v) => !v); }}
          className="flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-300"
        >
          <Plus className="w-4 h-4" /> Nova ocorrência
        </button>
      </header>

      {erro && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{erro}</div>
      )}

      {aberto && (
        <form
          className="grid gap-3 md:grid-cols-2 rounded-xl border border-[#EAD9A8] bg-[#FFFDF7] p-5"
          onSubmit={(e) => { e.preventDefault(); setErro(null); criar.mutate(); }}
        >
          <input className={inputCls} placeholder="Título da ocorrência" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
          <input className={inputCls} placeholder="Local" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} />
          <textarea className={`${inputCls} md:col-span-2`} rows={3} placeholder="Descrição do problema" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <select className={inputCls} value={form.gravidade} onChange={(e) => setForm({ ...form, gravidade: e.target.value as Criticidade })}>
            {Object.entries(CRITICIDADE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select className={inputCls} value={form.setor_id} onChange={(e) => setForm({ ...form, setor_id: e.target.value })}>
            <option value="">{perfil?.setores?.nome ? `O meu setor (${perfil.setores.nome})` : 'Escolher setor'}</option>
            {setores.map((s) => (<option key={s.id} value={s.id}>{s.nome}</option>))}
          </select>
          <select className={inputCls} value={form.responsavel_id} onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}>
            <option value="">Sem responsável</option>
            {colegas.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
          </select>
          <input className={inputCls} type="date" value={form.data_ocorrencia} onChange={(e) => setForm({ ...form, data_ocorrencia: e.target.value })} />
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-slate-400">
            <ImagePlus className="w-4 h-4 text-amber-400" />
            <input type="file" accept="image/*" onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)} className="text-sm" />
          </label>
          <button type="submit" disabled={criar.isPending} className="md:col-span-2 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50">
            {criar.isPending ? 'A registar...' : 'Registar ocorrência'}
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className={`${inputCls} pl-9`} placeholder="Pesquisar..." value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
        </div>
        <select className={`${inputCls} max-w-[200px]`} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}>
          <option value="todos">Todos os estados</option>
          {Object.entries(ESTADO_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-400">A carregar...</p>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border border-[#EAD9A8] bg-[#FFFDF7] p-6 text-slate-400">Sem ocorrências registadas.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map((o) => (
            <article key={o.id} className="rounded-xl border border-[#EAD9A8] bg-[#FFFDF7] p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-slate-100">{o.titulo}</h2>
                <span className={`text-xs px-2 py-1 rounded ${CRITICIDADE_CONFIG[o.gravidade].bgCor} ${CRITICIDADE_CONFIG[o.gravidade].cor}`}>
                  {CRITICIDADE_CONFIG[o.gravidade].label}
                </span>
              </div>
              {o.descricao && <p className="text-sm text-slate-400">{o.descricao}</p>}
              {o.foto_url && (
                <img src={o.foto_url} alt={`Foto da ocorrência ${o.titulo}`} loading="lazy" className="w-full max-h-48 object-cover rounded-lg border border-[#EAD9A8]" />
              )}
              <p className="text-xs text-slate-500">
                {o.setores?.nome ?? 'Setor'} · {o.localizacao || 'sem local'} · {o.data_ocorrencia}
                {o.perfis?.nome ? ` · ${o.perfis.nome}` : ''}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <select
                  className={`${inputCls} max-w-[170px] py-1.5 text-sm`}
                  value={o.estado}
                  onChange={(e) => mudarEstado.mutate({ id: o.id, estado: e.target.value as EstadoAtividade })}
                >
                  {Object.entries(ESTADO_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                </select>
                {isChefe && (
                  <button
                    onClick={() => { if (window.confirm('Eliminar esta ocorrência?')) eliminar.mutate(o.id); }}
                    className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const TITLE = 'Ocorrências — EMRICH Infraestruturas';
const DESCRIPTION = 'Registe e acompanhe ocorrências no terreno por setor, com gravidade, responsável e fotografia.';

export const Route = createFileRoute('/ocorrencias')({
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
        <OcorrenciasPage />
      </AppLayout>
    </RequireAuth>
  ),
});
