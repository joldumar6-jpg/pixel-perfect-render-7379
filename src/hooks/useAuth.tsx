
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
        // Verificar primeiro sessão em storage (para o Chefe oficial ou modo offline)
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('emrich_auth_session');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed?.user && parsed?.perfil) {
                setUser(parsed.user);
                setPerfil(parsed.perfil);
                setIsLoading(false);
                return;
              }
            } catch (e) {
              console.error('Error reading stored session:', e);
            }
          }
        }

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
        if (typeof window !== 'undefined' && !localStorage.getItem('emrich_auth_session')) {
          setUser(null);
          setPerfil(null);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Verificação de credenciais dedicadas de Chefe de Departamento
    const isChefeMaster =
      (cleanEmail === 'chefe@emrich.com' || cleanEmail === 'joldumar6@gmail.com') &&
      cleanPassword === 'Chefe@Emrich2026';

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

        const perfilData = await fetchPerfil(data.user.id);
        const finalPerfil: Perfil = perfilData || {
          id: data.user.id,
          user_id: data.user.id,
          nome: isChefeMaster ? 'Oldumar Julio' : (data.user.user_metadata?.nome || 'Utilizador'),
          email: cleanEmail,
          tipo_perfil: isChefeMaster ? 'chefe' : 'colaborador',
          setor_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setPerfil(finalPerfil);
        if (typeof window !== 'undefined') {
          localStorage.setItem('emrich_auth_session', JSON.stringify({ user: { id: data.user.id, email: cleanEmail }, perfil: finalPerfil }));
        }
        return { success: true };
      }

      // Se der erro de "Email not confirmed" ou outro e for o Chefe Master credenciado:
      if (isChefeMaster) {
        const chefeUser: User = {
          id: 'chefe-emrich-master',
          email: cleanEmail,
        };
        const chefePerfil: Perfil = {
          id: 'chefe-perfil-master',
          user_id: 'chefe-emrich-master',
          nome: 'Oldumar Julio',
          email: cleanEmail,
          tipo_perfil: 'chefe',
          setor_id: null,
          setores: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(chefeUser);
        setPerfil(chefePerfil);
        if (typeof window !== 'undefined') {
          localStorage.setItem('emrich_auth_session', JSON.stringify({ user: chefeUser, perfil: chefePerfil }));
        }
        return { success: true };
      }

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      // Fallback para o chefe mesmo com falha de conexão
      if (isChefeMaster) {
        const chefeUser: User = { id: 'chefe-emrich-master', email: cleanEmail };
        const chefePerfil: Perfil = {
          id: 'chefe-perfil-master',
          user_id: 'chefe-emrich-master',
          nome: 'Oldumar Julio',
          email: cleanEmail,
          tipo_perfil: 'chefe',
          setor_id: null,
          setores: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(chefeUser);
        setPerfil(chefePerfil);
        if (typeof window !== 'undefined') {
          localStorage.setItem('emrich_auth_session', JSON.stringify({ user: chefeUser, perfil: chefePerfil }));
        }
        return { success: true };
      }
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
