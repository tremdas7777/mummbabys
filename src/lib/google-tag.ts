// Tag do Google (gtag.js): Google Analytics 4 + Google Ads com um único script.
// O GA4 vem de src/lib/pixels.ts; o Google Ads (ID AW-... e rótulos de conversão), do /admin.
// O script entra no <head> pelo __root.tsx; aqui saem os eventos de e-commerce e as conversões.

export type GoogleAdsConfig = {
  adsId: string | null;
  /** Rótulo da conversão "Compra" (Pix pago). */
  purchaseLabel: string | null;
  /** Rótulo da conversão "Iniciar checkout" (opcional). */
  checkoutLabel: string | null;
  /** Rótulo da conversão "Pix gerado" (opcional). */
  pixLabel: string | null;
};

export const GA4_ID_RE = /^G-[A-Z0-9]{4,15}$/;
export const GOOGLE_ADS_ID_RE = /^AW-\d{6,15}$/;
export const GOOGLE_ADS_LABEL_RE = /^[A-Za-z0-9_-]{4,40}$/;

/** Fila própria do gtag (em vez de "dataLayer"): os pushes de dataLayer que a loja já faz
 * (checkout_click, purchase) não viram eventos duplicados no GA4. */
const LAYER = "gtagLayer";

type GtagIds = { ga4: string | null; ads: GoogleAdsConfig | null };
type GtagWindow = Window & {
  __gtag?: GtagIds;
  gtag?: (...args: unknown[]) => void;
};

/**
 * Script do <head>: snippet oficial do gtag.js com os dois destinos. Fora do /admin, para as
 * visitas ao painel não entrarem nos dados. Cada `config` já manda a visualização da 1ª página;
 * as trocas de página seguintes o GA4 mede sozinho (medição otimizada: histórico do navegador).
 */
export function googleTagHeadScript(ga4Id: string, ads: GoogleAdsConfig | null | undefined) {
  // Só valores no formato esperado entram no script (nada vindo do banco é colado cru).
  const ga4 = GA4_ID_RE.test(ga4Id) ? ga4Id : null;
  const label = (v: string | null) => (v && GOOGLE_ADS_LABEL_RE.test(v) ? v : null);
  const safeAds: GoogleAdsConfig | null =
    ads?.adsId && GOOGLE_ADS_ID_RE.test(ads.adsId)
      ? {
          adsId: ads.adsId,
          purchaseLabel: label(ads.purchaseLabel),
          checkoutLabel: label(ads.checkoutLabel),
          pixLabel: label(ads.pixLabel),
        }
      : null;
  const first = ga4 ?? safeAds?.adsId;
  if (!first) return null;
  const ids: GtagIds = { ga4, ads: safeAds };
  return (
    `(function(){if(location.pathname.indexOf("/admin")===0)return;var w=window;w.__gtag=${JSON.stringify(ids)};` +
    `if(typeof w.gtag!=="function"){w.${LAYER}=w.${LAYER}||[];w.gtag=function(){w.${LAYER}.push(arguments)};w.gtag('js',new Date());` +
    `var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${first}&l=${LAYER}';document.head.appendChild(s);}` +
    (ga4 ? `w.gtag('config','${ga4}');` : "") +
    (safeAds ? `w.gtag('config','${safeAds.adsId}',{allow_enhanced_conversions:true});` : "") +
    `})();`
  );
}

function tag() {
  if (typeof window === "undefined") return null;
  const w = window as GtagWindow;
  if (!w.__gtag || typeof w.gtag !== "function") return null;
  return { ids: w.__gtag, gtag: w.gtag };
}

/** Visualização de página do Google Ads (remarketing) nas trocas de rota; a 1ª saiu no <head>. */
export function gadsPageView(path: string) {
  const t = tag();
  const adsId = t?.ids.ads?.adsId;
  if (!t || !adsId || path.startsWith("/admin")) return;
  const href =
    window.location.pathname === path ? window.location.href : window.location.origin + path;
  t.gtag("event", "page_view", { send_to: adsId, page_path: path, page_location: href });
}

export type GoogleItem = { id: string; name: string; price: number };

function ecommerce(value: number, item?: GoogleItem) {
  return {
    currency: "BRL",
    value,
    items: item
      ? [{ item_id: item.id, item_name: item.name, price: item.price, quantity: 1 }]
      : undefined,
  };
}

const lastEvent = { key: "", at: 0 };

/**
 * Eventos de e-commerce do GA4. "begin_checkout" e "add_payment_info" (Pix gerado) também
 * disparam as conversões do Google Ads, quando o rótulo foi preenchido no /admin.
 */
export function googleTrack(
  event: "view_item" | "add_to_cart" | "begin_checkout" | "add_payment_info",
  value: number,
  item?: GoogleItem,
) {
  const t = tag();
  if (!t) return;
  // Mesmo evento com o mesmo valor em menos de 1,5 s = repetição: ignora.
  const key = `${event}|${value}|${item?.id ?? ""}`;
  const now = Date.now();
  if (lastEvent.key === key && now - lastEvent.at < 1500) return;
  lastEvent.key = key;
  lastEvent.at = now;
  const { ga4, ads } = t.ids;
  if (ga4)
    t.gtag("event", event, {
      send_to: ga4,
      ...ecommerce(value, item),
      ...(event === "add_payment_info" ? { payment_type: "pix" } : {}),
    });
  const label =
    event === "begin_checkout"
      ? ads?.checkoutLabel
      : event === "add_payment_info"
        ? ads?.pixLabel
        : null;
  if (ads?.adsId && label)
    t.gtag("event", "conversion", { send_to: `${ads.adsId}/${label}`, value, currency: "BRL" });
}

/** Telefone em E.164 (+55...), como o Google pede nas conversões otimizadas. */
function e164(phone?: string) {
  const d = phone?.replace(/\D/g, "") ?? "";
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return `+${d}`;
  return undefined;
}

/**
 * Compra (Pix pago): "purchase" no GA4 e conversão "Compra" no Google Ads. O id do pedido vai
 * como transaction_id, então o Google ignora a mesma compra enviada duas vezes. E-mail,
 * telefone e nome alimentam as conversões otimizadas (o gtag aplica o hash antes de enviar).
 */
export function googlePurchase(
  orderId: string,
  value: number,
  item?: GoogleItem,
  user?: { email?: string; phone?: string; name?: string },
) {
  const t = tag();
  if (!t) return;
  // Uma compra por pedido neste navegador (recarregar a página não reenvia).
  const key = `google-purchase-${orderId}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    // sem armazenamento: o transaction_id ainda evita duplicar no Google
  }
  const [firstName, ...rest] = (user?.name ?? "").trim().split(/\s+/);
  const lastName = rest.pop();
  const userData: Record<string, unknown> = {};
  if (user?.email) userData["email"] = user.email.trim().toLowerCase();
  const phone = e164(user?.phone);
  if (phone) userData["phone_number"] = phone;
  if (firstName && lastName)
    userData["address"] = { first_name: firstName, last_name: lastName, country: "BR" };
  if (Object.keys(userData).length) t.gtag("set", "user_data", userData);
  const { ga4, ads } = t.ids;
  if (ga4)
    t.gtag("event", "purchase", {
      send_to: ga4,
      transaction_id: orderId,
      ...ecommerce(value, item),
    });
  if (ads?.adsId && ads.purchaseLabel)
    t.gtag("event", "conversion", {
      send_to: `${ads.adsId}/${ads.purchaseLabel}`,
      value,
      currency: "BRL",
      transaction_id: orderId,
    });
}
