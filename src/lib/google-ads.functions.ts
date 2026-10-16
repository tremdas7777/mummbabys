import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GOOGLE_ADS_ID_RE, GOOGLE_ADS_LABEL_RE, type GoogleAdsConfig } from "./google-tag";
import { getGoogleAdsConfig, saveGoogleAdsConfig } from "./google-ads.server";

function assertAdmin(password: string) {
  if (password !== process.env["ADMIN_PASSWORD"]) throw new Error("Não autorizado");
}

/** Público: ID e rótulos (não são segredo, aparecem no código da página). Sem banco = sem tag. */
export const getGoogleAdsPublic = createServerFn({ method: "GET" }).handler(
  async (): Promise<GoogleAdsConfig | null> => getGoogleAdsConfig().catch(() => null),
);

export const getGoogleAdsAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const c = await getGoogleAdsConfig();
    return {
      adsId: c.adsId ?? "",
      purchaseLabel: c.purchaseLabel ?? "",
      checkoutLabel: c.checkoutLabel ?? "",
      pixLabel: c.pixLabel ?? "",
    };
  });

const label = (name: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || GOOGLE_ADS_LABEL_RE.test(v), `Rótulo "${name}" inválido`);

export const saveGoogleAdsAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        password: z.string().min(1).max(200),
        adsId: z
          .string()
          .trim()
          .refine(
            (v) => v === "" || GOOGLE_ADS_ID_RE.test(v),
            "ID deve ser no formato AW-123456789",
          ),
        purchaseLabel: label("Compra"),
        checkoutLabel: label("Iniciar checkout"),
        pixLabel: label("Pix gerado"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    await saveGoogleAdsConfig({
      adsId: data.adsId,
      purchaseLabel: data.purchaseLabel,
      checkoutLabel: data.checkoutLabel,
      pixLabel: data.pixLabel,
    });
    return { ok: true };
  });
