/**
 * Preços editáveis no /admin → Preços (ticket dos kits, oferta do checkout, upsell, seguro e
 * envio expresso). Os valores dos arquivos (bundles.ts, order-bump.ts, upsell.ts) são o padrão;
 * o que estiver salvo no banco (site_settings "prices") substitui o padrão.
 *
 * O servidor sempre recarrega do banco antes de cobrar (prices.server.ts), então o valor cobrado
 * no gateway do Pix é sempre o do painel. O navegador recebe os mesmos preços pelo loader da raiz só
 * para exibir.
 */
import { z } from "zod";
import { bundles, type BundleId } from "@/lib/bundles";
import { ORDER_BUMPS } from "@/lib/order-bump";
import { EXPRESS_SHIPPING, SHIPPING_INSURANCE, UPSELL_PACK } from "@/lib/upsell";

export const PRICES_SETTING_KEY = "prices";

const money = z.number().finite().min(0.01).max(1_000_000);
const offer = z
  .object({ price: money, compareAt: money.nullable() })
  .refine((o) => o.compareAt === null || o.compareAt > o.price, {
    message: 'O preço "de" precisa ser maior que o preço de venda.',
  });

export const priceConfigSchema = z.object({
  bundles: z.object({ "1": offer, "2": offer, "3": offer }),
  bump: offer,
  upsell: offer,
  seguro: money,
  expresso: money,
});

export type PriceOffer = { price: number; compareAt: number | null };
export type PriceConfig = z.infer<typeof priceConfigSchema>;

const round = (n: number) => Math.round(n * 100) / 100;
const bump = () => ORDER_BUMPS[0];

/** Preços em uso agora (o que a loja exibe e o servidor cobra). */
export function currentPrices(): PriceConfig {
  const kit = (id: BundleId): PriceOffer => {
    const b = bundles.find((x) => x.id === id)!;
    return { price: b.price, compareAt: b.compareAtPrice ?? null };
  };
  const b = bump();
  return {
    bundles: { "1": kit("1"), "2": kit("2"), "3": kit("3") },
    bump: b ? { price: b.price, compareAt: b.compareAt ?? null } : { price: 1, compareAt: null },
    upsell: { price: UPSELL_PACK.price, compareAt: UPSELL_PACK.listPrice },
    seguro: SHIPPING_INSURANCE.price,
    expresso: EXPRESS_SHIPPING.price,
  };
}

/** Preços de fábrica (valores dos arquivos), guardados antes de qualquer alteração. */
export const DEFAULT_PRICES: PriceConfig = structuredClone(currentPrices());

/**
 * Aplica os preços em toda a loja. Sem configuração válida, volta aos preços de fábrica.
 * Idempotente: pode rodar a cada render/requisição.
 */
export function applyPrices(raw: unknown): PriceConfig {
  const parsed = priceConfigSchema.safeParse(raw);
  const cfg = parsed.success ? parsed.data : DEFAULT_PRICES;
  for (const b of bundles) {
    const o = cfg.bundles[b.id];
    b.price = round(o.price);
    b.compareAtPrice = o.compareAt === null ? undefined : round(o.compareAt);
  }
  const bm = bump() as { price: number; compareAt?: number } | undefined;
  if (bm) {
    bm.price = round(cfg.bump.price);
    bm.compareAt = cfg.bump.compareAt === null ? undefined : round(cfg.bump.compareAt);
  }
  UPSELL_PACK.price = round(cfg.upsell.price);
  UPSELL_PACK.listPrice = round(cfg.upsell.compareAt ?? cfg.upsell.price);
  SHIPPING_INSURANCE.price = round(cfg.seguro);
  EXPRESS_SHIPPING.price = round(cfg.expresso);
  return cfg;
}
