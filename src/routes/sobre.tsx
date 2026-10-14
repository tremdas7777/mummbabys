import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { brand } from "@/lib/brand";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: `Sobre a ${brand.name}` },
      { name: "description", content: `A ${brand.name} vende lenços umedecidos para o dia a dia do bebê.` },
      { property: "og:title", content: `Sobre a ${brand.name}` },
      { property: "og:url", content: "/sobre" },
    ],
    links: [{ rel: "canonical", href: "/sobre" }],
  }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <div className="page">
        <h1>Sobre a {brand.name}</h1>
        <p>
          Lenço umedecido é item de todo dia: troca de fralda, mãozinha suja, passeio. A{" "}
          {brand.name} vende em kits grandes para sair mais barato por lenço e não faltar em casa.
        </p>
        <p>
          Nossos lenços são sem álcool etílico, livres de parabenos, com aloe vera e testados
          dermatologicamente. Enviamos para todo o Brasil, com rastreio e 7 dias para devolver.
        </p>
      </div>
    </SiteLayout>
  );
}
