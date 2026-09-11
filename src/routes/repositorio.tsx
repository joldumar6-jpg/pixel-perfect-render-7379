import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { registarAcao } from '@/lib/audit';
import { FolderOpen, Upload, Download, Trash2, Search } from 'lucide-react';

interface Documento {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  setor_id: string | null;
  ficheiro_path: string;
  tipo: string | null;
  tamanho: number | null;
  created_by: string;
  created_at: string;
  setores?: { nome: string } | null;
}

const CATEGORIAS = ['geral', 'plano', 'relatorio', 'contrato', 'fotografia', 'outro'];

const inputCls =
  'w-full rounded-lg bg-[#FBF3DE] border border-[#EAD9A8] px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400';

const formatarTamanho = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

function RepositorioPage() {
  const { user, perfil, isChefe } = useAuth();
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', categoria: 'geral', setor_id: '' });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: async () => {
      const { data } = await supabase.from('setores').select('id, nome').order('nome');
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentos')
        .select('*, setores(nome)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Documento[];
    },
  });

  const carregar = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sessão expirada.');
      if (!ficheiro) throw new Error('Escolha um ficheiro.');
      const caminho = `${user.id}/repositorio/${Date.now()}-${ficheiro.name}`;
      const { error: upErr } = await supabase.storage.from('documentos').upload(caminho, ficheiro);
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage.from('documentos').createSignedUrl(caminho, 60 * 60 * 24 * 365);

      const { data, error } = await supabase
        .from('documentos')
        .insert({
          nome: form.nome.trim() || ficheiro.name,
          descricao: form.descricao.trim() || null,
          categoria: form.categoria,
          setor_id: form.setor_id || perfil?.setor_id || null,
          ficheiro_path: caminho,
          ficheiro_url: signed?.signedUrl ?? '',
          tipo: ficheiro.type || null,
          tamanho: ficheiro.size,
          created_by: user.id,
        } as never)
        .select('id')
        .single();
      if (error) throw error;
      await registarAcao({
        userId: user.id,
        userNome: perfil?.nome,
        acao: 'carregou ficheiro',
        entidade: 'documento',
        entidadeId: (data as { id: string }).id,
        detalhes: { nome: form.nome || ficheiro.name },
      });
    },
    onSuccess: () => {
      setFicheiro(null);
      setForm({ nome: '', descricao: '', categoria: 'geral', setor_id: '' });
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar o ficheiro.'),
  });

  const eliminar = useMutation({
    mutationFn: async (doc: Documento) => {
      await supabase.storage.from('documentos').remove([doc.ficheiro_path]);
      const { error } = await supabase.from('documentos').delete().eq('id', doc.id);
      if (error) throw error;
      if (user) {
        await registarAcao({ userId: user.id, userNome: perfil?.nome, acao: 'eliminou ficheiro', entidade: 'documento', entidadeId: doc.id, detalhes: { nome: doc.nome } });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documentos'] }),
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível eliminar.'),
  });

  const descarregar = async (doc: Documento) => {
    setErro(null);
    const { data, error } = await supabase.storage.from('documentos').createSignedUrl(doc.ficheiro_path, 60 * 5);
    if (error || !data) {
      setErro('Não foi possível abrir o ficheiro.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const lista = documentos.filter((d) => {
    const okCat = filtroCategoria === 'todas' || d.categoria === filtroCategoria;
    const termo = pesquisa.trim().toLowerCase();
    const okTermo = !termo || d.nome.toLowerCase().includes(termo) || (d.descricao ?? '').toLowerCase().includes(termo);
    return okCat && okTermo;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-amber-400" /> Repositório
        </h1>
        <p className="text-sm text-slate-400">Guarde e partilhe documentos e fotografias por setor.</p>
      </header>

      {erro && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{erro}</div>}

      <form
        className="grid gap-3 md:grid-cols-2 rounded-xl border border-[#EAD9A8] bg-[#FFFDF7] p-5"
        onSubmit={(e) => { e.preventDefault(); setErro(null); carregar.mutate(); }}
      >
        <input className={inputCls} placeholder="Nome do documento" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <select className={inputCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
          {CATEGORIAS.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
        <input className={`${inputCls} md:col-span-2`} placeholder="Descrição (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <select className={inputCls} value={form.setor_id} onChange={(e) => setForm({ ...form, setor_id: e.target.value })}>
          <option value="">{perfil?.setores?.nome ? `O meu setor (${perfil.setores.nome})` : 'Sem setor'}</option>
          {setores.map((s) => (<option key={s.id} value={s.id}>{s.nome}</option>))}
        </select>
        <input type="file" onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)} className="text-sm text-slate-400" />
        <button type="submit" disabled={carregar.isPending} className="md:col-span-2 flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50">
          <Upload className="w-4 h-4" /> {carregar.isPending ? 'A carregar...' : 'Carregar ficheiro'}
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className={`${inputCls} pl-9`} placeholder="Pesquisar ficheiros..." value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
        </div>
        <select className={`${inputCls} max-w-[200px]`} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="todas">Todas as categorias</option>
          {CATEGORIAS.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-400">A carregar...</p>
      ) : lista.length === 0 ? (
        <p className="rounded-xl border border-[#EAD9A8] bg-[#FFFDF7] p-6 text-slate-400">Ainda não há ficheiros guardados.</p>
      ) : (
        <div className="space-y-2">
          {lista.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#EAD9A8] bg-[#FFFDF7] p-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-100 truncate">{d.nome}</p>
                <p className="text-xs text-slate-500">
                  {d.categoria} · {d.setores?.nome ?? 'sem setor'} · {formatarTamanho(d.tamanho)} · {new Date(d.created_at).toLocaleDateString('pt-PT')}
                </p>
                {d.descricao && <p className="text-sm text-slate-400 truncate">{d.descricao}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => descarregar(d)} className="rounded-lg bg-amber-400/10 p-2 text-amber-400 hover:bg-amber-400/20" title="Abrir">
                  <Download className="w-4 h-4" />
                </button>
                {(isChefe || d.created_by === user?.id) && (
                  <button
                    onClick={() => { if (window.confirm(`Eliminar "${d.nome}"?`)) eliminar.mutate(d); }}
                    className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TITLE = 'Repositório — EMRICH Infraestruturas';
const DESCRIPTION = 'Repositório de documentos e fotografias do departamento, organizado por setor e categoria.';

export const Route = createFileRoute('/repositorio')({
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
        <RepositorioPage />
      </AppLayout>
    </RequireAuth>
  ),
});
