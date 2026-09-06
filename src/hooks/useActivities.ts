
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Atividade, MetricasAtividades, EstadoAtividade, Criticidade, Setor, SETORES_DATA } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { calculateTaxaExecucao } from '@/lib/utils';

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

      if (error) throw error;

      // Filter by search on client side
      let filteredData = (data || []) as unknown as Atividade[];
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredData = filteredData.filter(
          (a) =>
            a.titulo.toLowerCase().includes(searchLower) ||
            a.descricao?.toLowerCase().includes(searchLower) ||
            a.localizacao?.toLowerCase().includes(searchLower)
        );
      }

      setAtividades(filteredData);
    } catch (err) {
      console.error('Error fetching atividades:', err);
      setError('Erro ao carregar atividades');
    } finally {
      setIsLoading(false);
    }
  }, [perfil, isChefe, options.setorId, options.estado, options.criticidade, options.search]);

  // Create atividade com restrição estrita de setor
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
    const targetSetorId = isChefe ? data.setor_id : perfil.setor_id;
    if (!targetSetorId) {
      return { success: false, error: 'Não possui um setor atribuído para criar atividades.' };
    }

    try {
      const { error } = await supabase.from('atividades').insert({
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        setor_id: targetSetorId,
        criticidade: data.criticidade,
        data_atividade: data.data_atividade,
        localizacao: data.localizacao ?? null,
        created_by: perfil.user_id,
        responsavel_id: perfil.id,
        estado: 'pendente',
      });

      if (error) throw error;

      await fetchAtividades();
      return { success: true };
    } catch (err) {
      console.error('Error creating atividade:', err);
      return { success: false, error: 'Erro ao criar atividade' };
    }
  };

  // Update atividade com restrição ao setor do colaborador
  const updateAtividade = async (
    id: string,
    data: Partial<Atividade>
  ) => {
    if (!perfil) return { success: false, error: 'Não autenticado' };

    try {
      const safeData = { ...data, updated_at: new Date().toISOString() };
      // Colaboradores não podem trocar a atividade de setor
      if (!isChefe) {
        delete safeData.setor_id;
      }

      let updateQuery = supabase
        .from('atividades')
        .update(safeData as never)
        .eq('id', id);

      // Colaborador só pode atualizar atividades que sejam do seu próprio setor
      if (!isChefe && perfil.setor_id) {
        updateQuery = updateQuery.eq('setor_id', perfil.setor_id);
      }

      const { error } = await updateQuery;

      if (error) throw error;

      // Registrar no histórico se mudou o estado
      if (data.estado) {
        const atividade = atividades.find(a => a.id === id);
        if (atividade && atividade.estado !== data.estado) {
          await supabase.from('historico_atividades').insert({
            atividade_id: id,
            user_id: perfil.user_id,
            estado_anterior: atividade.estado,
            estado_novo: data.estado,
          });
        }
      }

      await fetchAtividades();
      return { success: true };
    } catch (err) {
      console.error('Error updating atividade:', err);
      return { success: false, error: 'Erro ao atualizar atividade' };
    }
  };

  // Update estado
  const updateEstado = async (id: string, novoEstado: EstadoAtividade) => {
    return updateAtividade(id, { estado: novoEstado });
  };

  // Delete atividade
  const deleteAtividade = async (id: string) => {
    if (!isChefe) return { success: false, error: 'Sem permissão. Apenas a chefia pode eliminar atividades.' };

    try {
      const { error } = await supabase.from('atividades').delete().eq('id', id);

      if (error) throw error;

      await fetchAtividades();
      return { success: true };
    } catch (err) {
      console.error('Error deleting atividade:', err);
      return { success: false, error: 'Erro ao eliminar atividade' };
    }
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
