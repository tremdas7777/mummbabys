// Configuração da tag do Google Ads, gerenciada pelo /admin (private_settings, só service role).
import { GOOGLE_ADS_ID_RE, GOOGLE_ADS_LABEL_RE, type GoogleAdsConfig } from "./google-tag";

const KEYS = {
  adsId: "google_ads_id",
  purchaseLabel: "google_ads_purchase_label",
  checkoutLabel: "google_ads_checkout_label",
  pixLabel: "google_ads_pix_label",
} as const;

export async function getGoogleAdsConfig(): Promise<GoogleAdsConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("private_settings")
    .select("key,value")
    .in("key", Object.values(KEYS));
  const m = new Map((data ?? []).map((r) => [r.key, r.value]));
  const id = m.get(KEYS.adsId);
  const label = (k: string) => {
    const v = m.get(k);
    return v && GOOGLE_ADS_LABEL_RE.test(v) ? v : null;
  };
  return {
    adsId: id && GOOGLE_ADS_ID_RE.test(id) ? id : null,
    purchaseLabel: label(KEYS.purchaseLabel),
    checkoutLabel: label(KEYS.checkoutLabel),
    pixLabel: label(KEYS.pixLabel),
  };
}

/** Campo vazio = desligado (ID vazio tira a tag do site). */
export async function saveGoogleAdsConfig(c: {
  adsId: string;
  purchaseLabel: string;
  checkoutLabel: string;
  pixLabel: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("private_settings").upsert(
    (Object.keys(KEYS) as Array<keyof typeof KEYS>).map((k) => ({
      key: KEYS[k],
      value: c[k],
      updated_at: now,
    })),
  );
  if (error) throw new Error(error.message);
}
