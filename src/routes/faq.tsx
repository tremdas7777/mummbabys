import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { FaqList } from "@/components/mumm/Store";
import { brand } from "@/lib/brand";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: `Perguntas frequentes | ${brand.name}` },
      {
        name: "description",
        content: "Dúvidas sobre os lenços Mumm Baby: entrega, frete grátis, pagamento e devolução.",
      },
      { property: "og:title", content: `Perguntas frequentes | ${brand.name}` },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
  }),
  component: () => (
    <SiteLayout>
      <div className="page">
        <h1>Perguntas frequentes</h1>
        <section className="card" style={{ borderRadius: 12 }}>
          <FaqList />
        </section>
        <p style={{ marginTop: 16 }}>
          Não achou sua dúvida? <Link to="/contato">Fale com a gente</Link>.
        </p>
      </div>
    </SiteLayout>
  ),
});
