import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  googlePurchase,
  googleTagHeadScript,
  googleTrack,
  type GoogleAdsConfig,
} from "@/lib/google-tag";

const ADS: GoogleAdsConfig = {
  adsId: "AW-123456789",
  purchaseLabel: "CompraLbl1",
  checkoutLabel: "CheckLbl1",
  pixLabel: null,
};

type W = Window & Record<string, unknown>;
const w = window as unknown as W;

/** Roda o script do <head> como o navegador faria e devolve os comandos que entraram na fila. */
function runHead(path: string, ads: GoogleAdsConfig | null = ADS) {
  window.history.replaceState({}, "", path);
  const script = googleTagHeadScript("G-D6D57X26P0", ads);
  if (script) new Function(script)();
  return queue();
}

const queue = () => ((w["gtagLayer"] as IArguments[] | undefined) ?? []).map((a) => Array.from(a));

describe("tag do Google (GA4 + Ads)", () => {
  beforeEach(() => {
    delete w["gtag"];
    delete w["gtagLayer"];
    delete w["__gtag"];
    delete w["dataLayer"];
    document.head.innerHTML = "";
    // localStorage em memória (o do Node, sem arquivo, não funciona aqui).
    const mem = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    });
  });

  it("carrega um gtag.js só, com GA4 e Google Ads, numa fila própria", () => {
    const q = runHead("/");
    const src = document.head.querySelector("script")?.getAttribute("src");
    expect(src).toBe("https://www.googletagmanager.com/gtag/js?id=G-D6D57X26P0&l=gtagLayer");
    expect(q[0]?.[0]).toBe("js");
    expect(q.slice(1)).toEqual([
      ["config", "G-D6D57X26P0"],
      ["config", "AW-123456789", { allow_enhanced_conversions: true }],
    ]);
    // A fila precisa receber o objeto `arguments` (o gtag.js ignora arrays comuns).
    expect(Object.prototype.toString.call((w["gtagLayer"] as unknown[])[0])).toBe(
      "[object Arguments]",
    );
    expect(w["dataLayer"]).toBeUndefined();
  });

  it("não carrega no /admin", () => {
    expect(runHead("/admin")).toEqual([]);
    expect(document.head.querySelector("script")).toBeNull();
  });

  it("sem Google Ads no /admin, fica só o GA4", () => {
    const q = runHead("/", null);
    expect(q.slice(1)).toEqual([["config", "G-D6D57X26P0"]]);
  });

  it("não cola no script rótulo fora do formato", () => {
    const script = googleTagHeadScript("G-D6D57X26P0", {
      ...ADS,
      purchaseLabel: "x';alert(1);//",
    });
    expect(script).not.toContain("alert");
  });

  it("begin_checkout vai para o GA4 e dispara a conversão de checkout", () => {
    runHead("/checkout");
    const before = queue().length;
    googleTrack("begin_checkout", 89.9, { id: "2", name: "Kit 2", price: 89.9 });
    googleTrack("begin_checkout", 89.9, { id: "2", name: "Kit 2", price: 89.9 }); // repetição
    expect(queue().slice(before)).toEqual([
      [
        "event",
        "begin_checkout",
        {
          send_to: "G-D6D57X26P0",
          currency: "BRL",
          value: 89.9,
          items: [{ item_id: "2", item_name: "Kit 2", price: 89.9, quantity: 1 }],
        },
      ],
      ["event", "conversion", { send_to: "AW-123456789/CheckLbl1", value: 89.9, currency: "BRL" }],
    ]);
  });

  it("Pix gerado sem rótulo no /admin: só o evento do GA4", () => {
    runHead("/checkout");
    const before = queue().length;
    googleTrack("add_payment_info", 99.8);
    const sent = queue().slice(before);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.[1]).toBe("add_payment_info");
  });

  it("compra: GA4 + Ads com transaction_id, dados do cliente e uma vez por pedido", () => {
    runHead("/pedido/abc");
    const before = queue().length;
    const user = { email: " Maria@Ex.com ", phone: "(11) 98765-4321", name: "Maria da Silva" };
    googlePurchase("abc", 129.9, { id: "3", name: "Kit 3", price: 129.9 }, user);
    googlePurchase("abc", 129.9, undefined, user); // recarregou a página
    const sent = queue().slice(before);
    expect(sent).toHaveLength(3);
    expect(sent[0]).toEqual([
      "set",
      "user_data",
      {
        email: "maria@ex.com",
        phone_number: "+5511987654321",
        address: { first_name: "Maria", last_name: "Silva", country: "BR" },
      },
    ]);
    expect(sent[1]?.[1]).toBe("purchase");
    expect(sent[1]?.[2]).toMatchObject({
      send_to: "G-D6D57X26P0",
      transaction_id: "abc",
      value: 129.9,
    });
    expect(sent[2]).toEqual([
      "event",
      "conversion",
      { send_to: "AW-123456789/CompraLbl1", value: 129.9, currency: "BRL", transaction_id: "abc" },
    ]);
  });
});
