import { afterEach, describe, expect, it } from "vitest";
import { applyPrices } from "@/lib/prices";
import {
  FREE_SHIPPING_BUNDLE_ID,
  getBundle,
  getFreeShippingBundle,
  isFreeShippingEligible,
} from "@/lib/bundles";

describe("frete grátis", () => {
  afterEach(() => applyPrices(null));

  it("só o kit de 3.000 lenços tem frete grátis", () => {
    expect(FREE_SHIPPING_BUNDLE_ID).toBe("3");
    expect(isFreeShippingEligible(getBundle("1"))).toBe(false);
    expect(isFreeShippingEligible(getBundle("2"))).toBe(false);
    expect(isFreeShippingEligible(getBundle("3"))).toBe(true);
  });

  it("a oferta de troca leva para o kit de 3.000", () => {
    const alvo = getFreeShippingBundle();
    expect(alvo.wipes).toBe(3000);
    expect(isFreeShippingEligible(alvo)).toBe(true);
  });
});
