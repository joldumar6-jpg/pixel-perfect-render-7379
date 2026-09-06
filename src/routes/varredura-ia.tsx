import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/layout/RequireAuth";

import { AIScanPanel } from '@/components/ai/AIScanPanel';
import { AppLayout } from '@/components/layout';

function VarreduraIAPage() {
  return (
    <RequireAuth>
    <AppLayout>
      <AIScanPanel />
    </AppLayout>
    </RequireAuth>
  );
}

export const Route = createFileRoute("/varredura-ia")({
  head: () => ({
    meta: [
      { title: "Varredura IA — EMRICH Infraestruturas" },
      { name: "description", content: "Relatório executivo automático com gargalos e recomendações por setor." },
      { property: "og:title", content: "Varredura IA — EMRICH Infraestruturas" },
      { property: "og:description", content: "Relatório executivo automático com gargalos e recomendações por setor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VarreduraIAPage,
});
