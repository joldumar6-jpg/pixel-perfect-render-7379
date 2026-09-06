
import { useState, useEffect, useCallback } from 'react';
import { Atividade, MetricasAtividades, EstadoAtividade, Criticidade, Setor } from '@/lib/types';
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

      if (error) throw error;
      setSetores(data || []);
    } catch (err) {
      console.error('Error fetching setores:', err);
    }
  }, []);

  // Fetch atividades
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

      // Colaboradores só veem seu setor
      if (!isChefe && perfil?.setor_id) {
        query = query.eq('setor_id', perfil.setor_id);
      }

      // Filtros
      if (options.setorId) {
        query = query.eq('setor_id', options.setorId);
      }
      if (options.estado) {
        query = query.eq('estado', options.estado);
      }
      if (options.criticidade) {
        query = query.eq('criticidade', options.criticidade);
      }

      const { data, error } = await query;

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

  // Create atividade
  const createAtividade = async (data: {
    titulo: string;
    descricao?: string | undefined;
    setor_id: string;
    criticidade: Criticidade;
    data_atividade: string;
    localizacao?: string | undefined;
  }) => {
    if (!perfil) return { success: false, error: 'Não autenticado' };

    try {
      const { error } = await supabase.from('atividades').insert({
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        setor_id: data.setor_id,
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

  // Update atividade
  const updateAtividade = async (
    id: string,
    data: Partial<Atividade>
  ) => {
    if (!perfil) return { success: false, error: 'Não autenticado' };

    try {
      const { error } = await supabase
        .from('atividades')
        .update({ ...data, updated_at: new Date().toISOString() } as never)
        .eq('id', id);

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
    if (!isChefe) return { success: false, error: 'Sem permissão' };

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
    setores,
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
