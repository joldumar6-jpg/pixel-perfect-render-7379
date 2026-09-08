import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SETORES_DATA, type Setor } from "@/lib/types";

const TITLE = "EMRICH Infraestruturas — Gestão Operacional";
const DESCRIPTION =
  "Sistema de gestão operacional do Departamento de Infraestruturas: atividades, setores e relatórios executivos.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, user, isLoading: authLoading } = useAuth();
  const [modo, setModo] = useState<"login" | "registo">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState("");
  const [setores, setSetores] = useState<Setor[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: "/atividades" });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (modo !== "registo" || setores.length > 0) return;
    void supabase
      .from("setores")
      .select("*")
      .order("nome")
      .then(({ data }) => {
        if (!data || data.length === 0) {
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
          setSetores(data as unknown as Setor[]);
        }
      });
  }, [modo, setores.length]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setIsLoading(true);

    const result = await login(email, password);
    if (result.success) {
      navigate({ to: "/atividades" });
    } else {
      setError(result.error || "Erro ao iniciar sessão");
    }
    setIsLoading(false);
  };


  const handleRegisto = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setInfo("Conta criada. Confirme o email para poder entrar.");
        return;
      }

      const { error: perfilError } = await supabase.from("perfis").insert({
        user_id: data.user!.id,
        nome: nome.trim(),
        email,
        setor_id: setorId || null,
      });

      if (perfilError) {
        setError("Conta criada, mas não foi possível guardar o perfil.");
        return;
      }

      navigate({ to: "/atividades" });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FBF3DE] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF3DE] flex flex-col">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #f59e0b 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-amber-400">EMRICH</h1>
            <p className="text-slate-400 mt-1">Infraestruturas</p>
          </div>

          <div className="bg-[#FFFDF7] rounded-2xl border border-[#EAD9A8] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-100">
                  {modo === "login" ? "Iniciar Sessão" : "Criar Conta"}
                </h2>
                <p className="text-xs text-slate-400">
                  {modo === "login" ? "Aceda ao sistema" : "Registe o seu acesso"}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {info && (
              <div className="mb-4 p-3 bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-emerald-400 text-sm">
                {info}
              </div>
            )}


            <form
              onSubmit={modo === "login" ? handleLogin : handleRegisto}
              className="space-y-4"
            >
              {modo === "registo" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      placeholder="Nome do colaborador"
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Setor
                    </label>
                    <select
                      value={setorId}
                      onChange={(e) => setSetorId(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400/50"
                    >
                      <option value="">Selecione o setor</option>
                      {setores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Palavra-passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-amber-400 text-slate-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {modo === "login" ? "A entrar..." : "A criar conta..."}
                  </>
                ) : modo === "login" ? (
                  "Entrar"
                ) : (
                  "Criar conta"
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
              <button
                type="button"
                onClick={() => {
                  setModo(modo === "login" ? "registo" : "login");
                  setError(null);
                  setInfo(null);
                }}
                className="text-sm text-amber-400 hover:text-amber-300"
              >
                {modo === "login"
                  ? "Ainda não tem acesso? Criar conta"
                  : "Já tem conta? Iniciar sessão"}
              </button>
              <p className="text-xs text-slate-500 mt-3">
                Acesso restrito a colaboradores autorizados.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6">
            EMRICH INFRAESTRUTURAS v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
