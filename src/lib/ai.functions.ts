import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AIRecommendation {
  setor: string;
  desempenho: number;
  gargalos: string[];
  recomendacao: string;
}

export interface AIReport {
  resumo: string;
  taxaGlobal: number;
  setores: AIRecommendation[];
  gargalosCriticos: string[];
  recomendacoes: string[];
  generatedAt: string;
}

export const gerarRelatorioIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AIReport> => {
    const supabase = context.supabase;
    const userId = context.userId;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isChefe = (roles ?? []).some((r) => r.role === "chefe");
    if (!isChefe) {
      throw new Error("Acesso exclusivo para Chefes de Departamento");
    }

    const [{ data: setoresData }, { data: atividadesData }] = await Promise.all([
      supabase.from("setores").select("*").order("nome"),
      supabase.from("atividades").select("*").order("created_at", { ascending: false }),
    ]);

    const setores = setoresData ?? [];
    const atividades = atividadesData ?? [];

    const setorAnalises: AIRecommendation[] = setores.map((setor) => {
      const doSetor = atividades.filter((a) => a.setor_id === setor.id);
      const total = doSetor.length;
      const concluidas = doSetor.filter((a) => a.estado === "concluido").length;
      const pendentes = doSetor.filter((a) => a.estado === "pendente").length;
      const criticas = doSetor.filter(
        (a) => a.criticidade === "critica" && a.estado !== "concluido",
      ).length;
      const desempenho = total > 0 ? Math.round((concluidas / total) * 100) : 0;

      const gargalos: string[] = [];
      let recomendacao = "";

      if (total === 0) {
        gargalos.push("Nenhuma atividade registada");
        recomendacao = "Registar atividades para melhor controlo do setor.";
      } else if (desempenho < 50) {
        gargalos.push("Baixa taxa de conclusão");
        gargalos.push(`${pendentes} atividades pendentes`);
        recomendacao = "Priorizar atividades pendentes e analisar causas de atraso.";
      } else if (criticas > 2) {
        gargalos.push(`${criticas} atividades críticas pendentes`);
        recomendacao = "Abordar imediatamente as atividades críticas.";
      } else if (desempenho >= 70) {
        recomendacao = "Manter o bom desempenho e continuar a monitorização regular.";
      } else {
        recomendacao = "Continuar o trabalho regular e focar nas atividades pendentes.";
      }

      return { setor: setor.nome, desempenho, gargalos, recomendacao };
    });

    const totalAtividades = atividades.length;
    const totalConcluidas = atividades.filter((a) => a.estado === "concluido").length;
    const totalPendentes = atividades.filter((a) => a.estado === "pendente").length;
    const taxaGlobal =
      totalAtividades > 0 ? Math.round((totalConcluidas / totalAtividades) * 100) : 0;

    const gargalosCriticos: string[] = [];
    const setoresComCriticas = setorAnalises.filter((s) =>
      s.gargalos.some((g) => g.includes("crítica")),
    );
    if (setoresComCriticas.length > 0) {
      gargalosCriticos.push(
        `${setoresComCriticas.length} setores com atividades críticas pendentes`,
      );
    }
    const setoresBaixos = setorAnalises.filter((s) => s.desempenho < 50 && s.desempenho > 0);
    if (setoresBaixos.length > 0) {
      gargalosCriticos.push(
        `${setoresBaixos.length} setores com taxa de execução abaixo de 50%`,
      );
    }
    if (totalAtividades === 0) {
      gargalosCriticos.push("Nenhuma atividade registada no sistema");
    }

    const recomendacoes: string[] = [];
    if (taxaGlobal < 50) {
      recomendacoes.push(
        "Implementar reuniões semanais de acompanhamento para identificar bloqueios",
      );
      recomendacoes.push(
        "Rever processos e alocar recursos adicionais nos setores com menor desempenho",
      );
    }
    if (totalConcluidas === 0) {
      recomendacoes.push(
        "Iniciar imediatamente atividades de alta prioridade para demonstrar progresso",
      );
    }
    if (recomendacoes.length < 3) {
      recomendacoes.push("Manter comunicação regular entre setores para otimizar recursos");
    }
    if (recomendacoes.length < 3) {
      recomendacoes.push("Documentar lições aprendidas para melhorar processos futuros");
    }

    const resumo = `Durante o período analisado, o Departamento de Infraestruturas gere ${totalAtividades} atividades distribuídas pelos setores operacionais. A taxa global de execução é de ${taxaGlobal}%, com ${totalConcluidas} atividades concluídas e ${totalPendentes} pendentes. ${
      setoresBaixos.length > 0
        ? `Os setores ${setoresBaixos.map((s) => s.setor).join(", ")} requerem atenção especial.`
        : "Os setores apresentam desempenho estável."
    } ${
      gargalosCriticos.length > 0
        ? "Recomenda-se atenção aos gargalos identificados."
        : "Não foram identificados gargalos críticos."
    }`;

    const report: AIReport = {
      resumo,
      taxaGlobal,
      setores: setorAnalises,
      gargalosCriticos,
      recomendacoes,
      generatedAt: new Date().toISOString(),
    };

    const now = new Date();
    await supabase.from("relatorios_executivos_ia").insert({
      periodo_mes: now.getMonth() + 1,
      periodo_ano: now.getFullYear(),
      gerado_por: userId,
      taxa_global: taxaGlobal,
      dados_setores: setorAnalises as unknown as never,
      conteudo_completo: JSON.stringify(report),
    });

    return report;
  });
