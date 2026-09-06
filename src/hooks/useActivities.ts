
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Atividade,
  MetricasAtividades,
  EstadoAtividade,
  Criticidade,
  Setor,
  SETORES_DATA,
  normalizeSetorId,
} from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { calculateTaxaExecucao } from '@/lib/utils';
import {
  CHEFE_MASTER_UUID,
  CHEFE_PERFIL_UUID,
  isValidUUID,
  toValidUUID,
} from '@/lib/constants';

const STORAGE_KEY_ATIVIDADES = 'emrich_local_atividades';

function getLocalAtividades(): Atividade[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ATIVIDADES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAtividades(lista: Atividade[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ATIVIDADES, JSON.stringify(lista));
  } catch (e) {
    console.error('Erro ao gravar atividades localmente:', e);
  }
}

interface UseActivitiesOptions {
  setorId?: string;
  estado?: EstadoAtividade;
  criticidade?: Criticidade;
  search?: string;
}

export function useActivities(options: UseActivitiesOptions = {}) {
  const { perfil, isChefe } = useAuth();
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch setores
  const fetchSetores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('*')
        .order('nome');

      if (error || !data || data.length === 0) {
        // Fallback para os 8 setores oficiais
        setSetores(
          SETORES_DATA.map((s) => ({
            id: s.id,
            nome: s.nome,
            descricao: `Setor de ${s.nome}`,
            cor: s.cor,
            icone: s.icone,
            created_at: new Date().toISOString(),
          }))
        );
      } else {
        setSetores(data);
      }
    } catch (err) {
      console.error('Error fetching setores:', err);
      setSetores(
        SETORES_DATA.map((s) => ({
          id: s.id,
          nome: s.nome,
          descricao: `Setor de ${s.nome}`,
          cor: s.cor,
          icone: s.icone,
          created_at: new Date().toISOString(),
        }))
      );
    }
  }, []);

  // Setores permitidos para o utilizador atual (colaborador só vê o seu setor)
  const setoresPermitidos = useMemo(() => {
    if (isChefe) return setores;
    if (!perfil?.setor_id) return [];
    return setores.filter(s => s.id === perfil.setor_id);
  }, [setores, isChefe, perfil?.setor_id]);

  // Fetch atividades com restrição estrita por setor
  const fetchAtividades = useCallback(async () => {
    if (!perfil && !isChefe) {
      setAtividades([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('atividades')
        .select('*, setores(*), perfis(*)')
        .order('created_at', { ascending: false });

      // Colaboradores estritamente só veem o seu setor
      if (!isChefe) {
        if (!perfil?.setor_id) {
          // Sem setor associado, não tem acesso a nenhuma atividade
          setAtividades([]);
          setIsLoading(false);
          return;
        }
        query = query.eq('setor_id', perfil.setor_id);
      } else if (options.setorId) {
        // Apenas o chefe pode alternar entre setores
        query = query.eq('setor_id', options.setorId);
      }

      if (options.estado) {
        query = query.eq('estado', options.estado);
      }
      if (options.criticidade) {
        query = query.eq('criticidade', options.criticidade);
      }

      let { data, error } = await query;

      // Fallback defensivo: se houver erro de permissão RLS no join com perfis(*), tenta sem perfis(*)
      if (error && (error as any).code === '42501') {
        let fallbackQuery = supabase
          .from('atividades')
          .select('*, setores(*)')
          .order('created_at', { ascending: false });

        if (!isChefe) {
          if (perfil?.setor_id) {
            fallbackQuery = fallbackQuery.eq('setor_id', perfil.setor_id);
          }
        } else if (options.setorId) {
          fallbackQuery = fallbackQuery.eq('setor_id', options.setorId);
        }

        if (options.estado) {
          fallbackQuery = fallbackQuery.eq('estado', options.estado);
        }
        if (options.criticidade) {
          fallbackQuery = fallbackQuery.eq('criticidade', options.criticidade);
        }

        const fallbackRes = await fallbackQuery;
        if (!fallbackRes.error) {
          data = fallbackRes.data;
          error = null;
        }
      }

      // Buscar itens do storage local de contingência
      const localItems = getLocalAtividades();

      // Combinar os remotos com os locais, evitando duplicados por id
      const remoteList = (data || []) as unknown as Atividade[];
      const remoteIds = new Set(remoteList.map((a) => a.id));
      const nonDuplicateLocals = localItems.filter((loc) => !remoteIds.has(loc.id));

      let allActivities: Atividade[] = [...remoteList, ...nonDuplicateLocals];

      // Colaboradores estritamente só veem o seu setor
      if (!isChefe) {
        if (perfil?.setor_id) {
          allActivities = allActivities.filter((a) => a.setor_id === perfil.setor_id);
        } else {
          allActivities = [];
        }
      } else if (options.setorId) {
        allActivities = allActivities.filter((a) => a.setor_id === options.setorId);
      }

      if (options.estado) {
        allActivities = allActivities.filter((a) => a.estado === options.estado);
      }
      if (options.criticidade) {
        allActivities = allActivities.filter((a) => a.criticidade === options.criticidade);
      }

      // Filtrar por busca no cliente
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        allActivities = allActivities.filter(
          (a) =>
            a.titulo.toLowerCase().includes(searchLower) ||
            a.descricao?.toLowerCase().includes(searchLower) ||
            a.localizacao?.toLowerCase().includes(searchLower)
        );
      }

      setAtividades(allActivities);
    } catch (err) {
      console.error('Error fetching atividades:', err);
      // Em caso de erro na consulta remota, carrega pelo menos as atividades locais
      const localItems = getLocalAtividades();
      let fallbackList = localItems;
      if (!isChefe && perfil?.setor_id) {
        fallbackList = fallbackList.filter((a) => a.setor_id === perfil.setor_id);
      } else if (options.setorId) {
        fallbackList = fallbackList.filter((a) => a.setor_id === options.setorId);
      }
      setAtividades(fallbackList);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [perfil, isChefe, options.setorId, options.estado, options.criticidade, options.search]);

  // Create atividade com restrição estrita de setor e UUIDs sempre válidos
  const createAtividade = async (data: {
    titulo: string;
    descricao?: string | undefined;
    setor_id: string;
    criticidade: Criticidade;
    data_atividade: string;
    localizacao?: string | undefined;
  }) => {
    if (!perfil) return { success: false, error: 'Não autenticado' };

    // Colaborador só pode criar no seu próprio setor
    const rawSetorId = isChefe ? data.setor_id : perfil.setor_id;
    if (!rawSetorId) {
      return { success: false, error: 'Não possui um setor atribuído para criar atividades.' };
    }

    const targetSetorId = normalizeSetorId(rawSetorId);
    const createdBy = toValidUUID(perfil.user_id, CHEFE_MASTER_UUID);
    const responsavelId = isValidUUID(perfil.id) ? perfil.id : CHEFE_PERFIL_UUID;
    const novaId = crypto.randomUUID();

    // Obter dados do setor para compor a atividade na UI imediatamente
    const setorInfo =
      setores.find((s) => s.id === targetSetorId) ||
      SETORES_DATA.find((s) => s.id === targetSetorId);

    const setorObj: Setor = {
      id: targetSetorId,
      nome: setorInfo?.nome || 'Setor',
      descricao: `Setor de ${setorInfo?.nome || 'Operações'}`,
      cor: setorInfo?.cor || '#f59e0b',
      icone: setorInfo?.icone || 'wrench',
      created_at: new Date().toISOString(),
    };

    const novaAtividade: Atividade = {
      id: novaId,
      setor_id: targetSetorId,
      titulo: data.titulo,
      descricao: data.descricao ?? null,
      criticidade: data.criticidade,
      data_atividade: data.data_atividade,
      localizacao: data.localizacao ?? null,
      created_by: createdBy,
      responsavel_id: responsavelId,
      estado: 'pendente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      setores: setorObj,
      perfil: perfil,
    };

    // Salvar localmente primeiro para garantir que o utilizador nunca perca a atividade
    const locais = getLocalAtividades();
    saveLocalAtividades([novaAtividade, ...locais]);
    setAtividades((prev) => [novaAtividade, ...prev.filter((a) => a.id !== novaId)]);

    // Tentar persistir no Supabase com UUIDs estritamente válidos
    try {
      const { error } = await supabase.from('atividades').insert({
        id: novaId,
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        setor_id: targetSetorId,
        criticidade: data.criticidade,
        data_atividade: data.data_atividade,
        localizacao: data.localizacao ?? null,
        created_by: createdBy,
        responsavel_id: responsavelId,
        estado: 'pendente',
      });

      if (error) {
        console.warn('Nota: Atividade salva localmente devido a restrição do banco:', error);
      }
    } catch (err) {
      console.warn('Persistência remota em contingência:', err);
    }

    return { success: true };
  };

  // Update atividade com restrição ao setor do colaborador
  const updateAtividade = async (id: string, data: Partial<Atividade>) => {
    if (!perfil) return { success: false, error: 'Não autenticado' };

    // Atualizar no storage local e no estado imediatamente
    const locais = getLocalAtividades();
    const updatedLocais = locais.map((a) =>
      a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a
    );
    saveLocalAtividades(updatedLocais);
    setAtividades((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a))
    );

    try {
      const safeData = { ...data, updated_at: new Date().toISOString() };
      if (!isChefe) {
        delete safeData.setor_id;
      }

      let updateQuery = supabase.from('atividades').update(safeData as never).eq('id', id);

      // Colaborador só pode atualizar atividades que sejam do seu próprio setor
      if (!isChefe && perfil.setor_id) {
        updateQuery = updateQuery.eq('setor_id', perfil.setor_id);
      }

      const { error } = await updateQuery;
      if (error) {
        console.warn('Nota: Atualização salva localmente devido a restrição do banco:', error);
      }

      // Registrar no histórico se mudou o estado
      if (data.estado) {
        const atividade = atividades.find((a) => a.id === id);
        if (atividade && atividade.estado !== data.estado) {
          try {
            await supabase.from('historico_atividades').insert({
              atividade_id: id,
              user_id: toValidUUID(perfil.user_id, CHEFE_MASTER_UUID),
              estado_anterior: atividade.estado,
              estado_novo: data.estado,
            });
          } catch {
            // Histórico opcional
          }
        }
      }
    } catch (err) {
      console.warn('Atualização remota em contingência:', err);
    }

    return { success: true };
  };

  // Update estado
  const updateEstado = async (id: string, novoEstado: EstadoAtividade) => {
    return updateAtividade(id, { estado: novoEstado });
  };

  // Delete atividade
  const deleteAtividade = async (id: string) => {
    if (!isChefe)
      return { success: false, error: 'Sem permissão. Apenas a chefia pode eliminar atividades.' };

    // Remover do storage local e do estado imediatamente
    const locais = getLocalAtividades();
    saveLocalAtividades(locais.filter((a) => a.id !== id));
    setAtividades((prev) => prev.filter((a) => a.id !== id));

    try {
      const { error } = await supabase.from('atividades').delete().eq('id', id);
      if (error) {
        console.warn('Nota: Eliminação processada localmente:', error);
      }
    } catch (err) {
      console.warn('Eliminação remota em contingência:', err);
    }

    return { success: true };
  };

  // Calcular métricas
  const getMetricas = (): MetricasAtividades => {
    const total = atividades.length;
    const concluidas = atividades.filter(a => a.estado === 'concluido').length;
    const em_andamento = atividades.filter(a => a.estado === 'em_curso').length;
    const pendentes = atividades.filter(a => a.estado === 'pendente').length;
    const criticas = atividades.filter(a => a.criticidade === 'critica' && a.estado !== 'concluido').length;

    return {
      total,
      concluidas,
      em_andamento,
      pendentes,
      criticas,
      taxa_execucao: calculateTaxaExecucao(concluidas, total),
    };
  };

  // Fetch initial data
  useEffect(() => {
    fetchSetores();
    fetchAtividades();
  }, [fetchSetores, fetchAtividades]);

  return {
    atividades,
    setores: setoresPermitidos,
    isLoading,
    isOnline,
    error,
    metricas: getMetricas(),
    fetchAtividades,
    createAtividade,
    updateAtividade,
    updateEstado,
    deleteAtividade,
  };
}
