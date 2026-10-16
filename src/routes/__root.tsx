import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useAntiCopy } from "@/hooks/useAntiCopy";
import { useTrackPageView } from "@/hooks/useTrackPageView";
import { GA4_MEASUREMENT_ID, META_PIXEL_ID, TIKTOK_PIXEL_ID, UTMIFY_PIXEL_ID } from "@/lib/pixels";
import { useMetaPixel } from "@/hooks/useMetaPixel";
import { useGoogleTag } from "@/hooks/useGoogleTag";
import { getGoogleAdsPublic } from "@/lib/google-ads.functions";
import { googleTagHeadScript, type GoogleAdsConfig } from "@/lib/google-tag";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { brand } from "@/lib/brand";
import { FREE_SHIPPING_LABEL } from "@/lib/bundles";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getPrices } from "@/lib/prices.functions";
import { applyPrices } from "@/lib/prices";

import appCss from "../styles.css?url";

const TITLE = "Lenços Umedecidos Mumm Baby | Sem álcool, com aloe vera";
const DESCRIPTION = `Lenços umedecidos Mumm Baby em kits de 1.000 a 3.000 unidades. Sem álcool, livres de parabenos, com aloe vera. ${FREE_SHIPPING_LABEL}.`;

/** Scripts de pixel do <head> — só entram os que têm ID em src/lib/pixels.ts (Google Ads: /admin). */
function pixelScripts(googleAds: GoogleAdsConfig | null | undefined) {
  const scripts: { type: string; children: string }[] = [];
  // Tag do Google (gtag.js): GA4 + Google Ads num script só.
  const google = googleTagHeadScript(GA4_MEASUREMENT_ID, googleAds);
  if (google) scripts.push({ type: "text/javascript", children: google });
  if (META_PIXEL_ID)
    scripts.push({
      type: "text/javascript",
      // Meta Pixel (código oficial) inicializado já no <head>, antes da UTMify e do app.
      // Sem PageView aqui: o app envia o PageView com event_id, igual ao da API de Conversões (sem duplicar).
      children: `(function(){if(location.pathname.indexOf("/admin")===0)return;!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');window.__metaHeadPixel='${META_PIXEL_ID}';})();`,
    });
  if (TIKTOK_PIXEL_ID)
    scripts.push({
      type: "text/javascript",
      children: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script"),n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${TIKTOK_PIXEL_ID}');ttq.page()}(window,document,'ttq');`,
    });
  if (UTMIFY_PIXEL_ID)
    scripts.push({
      type: "text/javascript",
      // Pixel da UTMify (snippet oficial).
      // Fora do /admin, para as visitas ao painel não entrarem nos dados.
      children: `(function(){if(location.pathname.indexOf("/admin")===0)return;if(document.querySelector('script[src*="cdn.utmify.com.br/scripts/pixel/pixel.js"]'))return;window.pixelId="${UTMIFY_PIXEL_ID}";var a=document.createElement("script");a.setAttribute("async","");a.setAttribute("defer","");a.setAttribute("src","https://cdn.utmify.com.br/scripts/pixel/pixel.js");document.head.appendChild(a);})();`,
    });
  return scripts;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: import("@tanstack/react-router").ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "lenços umedecidos, lenço umedecido bebê, toalhas umedecidas, Mumm Baby, sem álcool, aloe vera, kit lenços umedecidos",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:site_name", content: brand.name },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: brand.colors.primary },
      { property: "og:title", content: TITLE },
      { name: "twitter:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:description", content: DESCRIPTION },
      // og:image precisa de URL absoluta: só entra com o domínio definido em brand.siteUrl.
      ...(brand.siteUrl
        ? [
            { property: "og:image", content: `${brand.siteUrl}/og-image.jpg` },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
            { property: "og:image:alt", content: "Lenços Umedecidos Mumm Baby" },
            { name: "twitter:image", content: `${brand.siteUrl}/og-image.jpg` },
          ]
        : []),
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800;6..12,900&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
    scripts: pixelScripts(loaderData?.googleAds),
  }),
  // Preços do /admin → Preços (só exibição; o servidor recalcula antes de cobrar). Se o banco
  // falhar, a loja abre com os preços de fábrica (e a cobrança não sai até o banco voltar).
  // Tag do Google Ads (/admin) vem junto, para já sair no <head> renderizado no servidor.
  loader: async () => {
    const [prices, googleAds] = await Promise.all([
      getPrices().catch(() => null),
      getGoogleAdsPublic().catch(() => null),
    ]);
    return { prices, googleAds };
  },
  staleTime: 60_000,
  // Não recarrega os preços a cada navegação dentro do site (ex.: trocar de kit no checkout):
  // a recarga podia recriar a página e apagar o que o cliente digitou. O servidor sempre
  // recalcula o preço antes de gerar o Pix.
  shouldReload: false,
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {META_PIXEL_ID && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            />
          </noscript>
        )}
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  applyPrices(Route.useLoaderData().prices);
  useAntiCopy();
  useTrackPageView();
  useMetaPixel();
  useGoogleTag();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <WhatsAppFloat />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
