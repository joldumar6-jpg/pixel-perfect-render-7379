
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Perfil, TipoPerfil } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

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

  const fetchPerfil = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*, setores(*)')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
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
      const newPerfil = await fetchPerfil(user.id);
      setPerfil(newPerfil);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });

          const perfilData = await fetchPerfil(session.user.id);
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
        const perfilData = await fetchPerfil(session.user.id);
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
        });

        const perfilData = await fetchPerfil(data.user.id);
        setPerfil(perfilData);
      }

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Erro ao fazer login' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
