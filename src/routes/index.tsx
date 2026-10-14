import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { MummStore } from "@/components/mumm/Store";
import { DEFAULT_BUNDLE_ID, parseBundleId, type BundleId } from "@/lib/bundles";
import { productHeroImage } from "@/lib/product-images";
import { planSearchSchema } from "@/lib/plan-search";

export const TITLE = "Lenços Umedecidos Mumm Baby – 1.000 unidades por R$ 39,90";
export const DESCRIPTION =
  "Kit Mumm Baby com pacotes de 100 lenços. Sem álcool, com aloe vera, testado dermatologicamente. Frete grátis no kit de 3.000 lenços e 7 dias para devolver.";

export const Route = createFileRoute("/")({
  validateSearch: planSearchSchema,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: productHeroImage },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const selected = parseBundleId(search.plano) ?? DEFAULT_BUNDLE_ID;
  const onSelect = (id: BundleId) =>
    navigate({ search: (prev) => ({ ...prev, plano: id }), replace: true, resetScroll: false });
  return (
    <SiteLayout>
      <MummStore selected={selected} onSelect={onSelect} />
    </SiteLayout>
  );
}
