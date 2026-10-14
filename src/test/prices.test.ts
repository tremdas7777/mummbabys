import { afterEach, describe, expect, it } from "vitest";
import { applyPrices, currentPrices, DEFAULT_PRICES, priceConfigSchema } from "@/lib/prices";
import { getBundle } from "@/lib/bundles";
import { bumpsTotal, ORDER_BUMPS } from "@/lib/order-bump";
import { EXPRESS_SHIPPING, upsellDiscount, upsellSelection } from "@/lib/upsell";
import { checkoutTotals } from "@/lib/payment-pricing";

const custom = () => {
  const p = structuredClone(DEFAULT_PRICES);
  p.bundles["2"] = { price: 5990, compareAt: 8990 };
  p.bundles["3"] = { price: 7990.5, compareAt: null };
  p.bump = { price: 890, compareAt: 1290 };
  p.upsell = { price: 1490, compareAt: 2980 };
  p.seguro = 59.9;
  p.expresso = 39.9;
  return p;
};

describe("preços do painel", () => {
  afterEach(() => applyPrices(null));

  it("aplica os preços salvos em kits, bump, upsell, seguro e expresso", () => {
    applyPrices(custom());
    expect(getBundle("2").price).toBe(5990);
    expect(getBundle("2").compareAtPrice).toBe(8990);
    expect(getBundle("3").compareAtPrice).toBeUndefined();
    expect(bumpsTotal([ORDER_BUMPS[0]!.id])).toBe(890);
    expect(upsellDiscount()).toBeCloseTo(0.5);
    expect(EXPRESS_SHIPPING.price).toBe(39.9);
    const sel = upsellSelection(getBundle("2"), ["kit", "seguro"]);
    expect(sel.total).toBe(1549.9);
    // O total cobrado no Pix segue o preço do painel.
    const t = checkoutTotals({
      products: getBundle("2").price + bumpsTotal([ORDER_BUMPS[0]!.id]),
      frete: 0,
    });
    expect(t.total).toBe(688000);
    expect(currentPrices()).toEqual(custom());
  });

  it("sem configuração válida, volta aos preços de fábrica", () => {
    applyPrices(custom());
    applyPrices(null);
    expect(currentPrices()).toEqual(DEFAULT_PRICES);
    applyPrices({ bundles: { "1": { price: -5 } } });
    expect(currentPrices()).toEqual(DEFAULT_PRICES);
  });

  it("recusa preço zero e preço 'de' menor que o de venda", () => {
    const zero = custom();
    zero.bundles["1"].price = 0;
    expect(priceConfigSchema.safeParse(zero).success).toBe(false);
    const de = custom();
    de.bundles["1"] = { price: 5000, compareAt: 4000 };
    expect(priceConfigSchema.safeParse(de).success).toBe(false);
  });
});
