
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Perfil, TipoPerfil } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import {
  CHEFE_MASTER_UUID,
  CHEFE_PERFIL_UUID,
  isValidUUID,
  toValidUUID,
} from '@/lib/constants';

interface AuthContextType {
  user: User | null;
  perfil: Perfil | null;
  isLoading: boolean;
  isChefe: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPerfil = async (
    userId: string,
    userEmail?: string,
    userMetadata?: Record<string, unknown>
  ): Promise<Perfil | null> => {
    // Se for a conta do Chefe Master oficial ou UUID canónico
    if (
      userId === 'chefe-emrich-master' ||
      userId === CHEFE_MASTER_UUID ||
      userEmail?.toLowerCase() === 'chefe@emrich.com'
    ) {
      return {
        id: CHEFE_PERFIL_UUID,
        user_id: CHEFE_MASTER_UUID,
        nome: 'Oldumar Julio',
        email: userEmail || 'chefe@emrich.com',
        tipo_perfil: 'chefe',
        setor_id: null,
        setores: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*, setores(*)')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Se for erro de permissão RLS 42501 (ex: meu_setor) ou PGRST116 (ainda sem perfil no banco)
        if (error.code === '42501' || error.code === 'PGRST116') {
          // Recuperar do localStorage se houver
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('emrich_auth_session');
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                if (
                  parsed?.perfil &&
                  (parsed.perfil.user_id === userId || parsed.perfil.email === userEmail)
                ) {
                  return parsed.perfil;
                }
              } catch {
                // ignore
              }
            }
          }

          // Fallback gracioso construído a partir da sessão/metadata para manter a aplicação funcional
          const isChefeUser =
            userEmail?.toLowerCase() === 'joldumar6@gmail.com' ||
            userEmail?.toLowerCase() === 'chefe@emrich.com' ||
            userMetadata?.['tipo_perfil'] === 'chefe';

          const fallbackNome =
            (userMetadata?.['nome'] as string) ||
            (userEmail ? userEmail.split('@')[0]! : 'Utilizador');

          const fallbackPerfil: Perfil = {
            id: userId,
            user_id: userId,
            nome: fallbackNome,
            email: userEmail || '',
            tipo_perfil: isChefeUser ? 'chefe' : ((userMetadata?.['tipo_perfil'] as TipoPerfil) || 'colaborador'),
            setor_id: (userMetadata?.['setor_id'] as string) || null,
            setores: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'emrich_auth_session',
              JSON.stringify({ user: { id: userId, email: userEmail }, perfil: fallbackPerfil })
            );
          }

          return fallbackPerfil;
        }

        console.error('Error fetching perfil:', error);
        return null;
      }
      return (data as unknown as Perfil) ?? null;
    } catch (err) {
      console.error('Error fetching perfil:', err);
      return null;
    }
  };

  const refreshPerfil = async () => {
    if (user?.id) {
      const newPerfil = await fetchPerfil(user.id, user.email);
      setPerfil(newPerfil);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('emrich_auth_session');
        }



        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });

          const perfilData = await fetchPerfil(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          );
          setPerfil(perfilData);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
        });
        const perfilData = await fetchPerfil(
          session.user.id,
          session.user.email,
          session.user.user_metadata
        );
        setPerfil(perfilData);
      } else {
        setUser(null);
        setPerfil(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (!error && data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
        });

        const perfilData = await fetchPerfil(
          data.user.id,
          cleanEmail,
          data.user.user_metadata
        );
        const finalPerfil: Perfil = perfilData || {
          id: data.user.id,
          user_id: data.user.id,
          nome: (data.user.user_metadata?.['nome'] as string) || 'Utilizador',
          email: cleanEmail,
          tipo_perfil: 'colaborador',
          setor_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setPerfil(finalPerfil);
        return { success: true };
      }


      if (error) {
        return { success: false, error: error.message };
      }

      return { success: false, error: 'Não foi possível iniciar sessão' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Erro ao fazer login' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('emrich_auth_session');
    }
    setUser(null);
    setPerfil(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        isLoading,
        isChefe: perfil?.tipo_perfil === 'chefe',
        login,
        logout,
        refreshPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
