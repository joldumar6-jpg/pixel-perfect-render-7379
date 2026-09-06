import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/layout/RequireAuth";

import { SQLPanel } from '@/components/sql/SQLPanel';
import { AppLayout } from '@/components/layout';

function SQLPage() {
  return (
    <RequireAuth>
    <AppLayout>
      <SQLPanel />
    </AppLayout>
    </RequireAuth>
  );
}

export const Route = createFileRoute("/sql")({
  head: () => ({
    meta: [
      { title: "Estrutura de dados — EMRICH Infraestruturas" },
      { name: "description", content: "Consulte o esquema completo da base de dados do sistema de gestão operacional." },
      { property: "og:title", content: "Estrutura de dados — EMRICH Infraestruturas" },
      { property: "og:description", content: "Consulte o esquema completo da base de dados do sistema de gestão operacional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SQLPage,
});
