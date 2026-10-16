
/**
 * Order bumps do checkout (ofertas logo acima do botão de finalizar).
 * Preços usados no servidor — o cliente só exibe. Lista vazia = checkout sem bump.
 */
export type OrderBumpItem = {
  id: string;
  name: string;
  fullName: string;
  /** Nome enviado ao gateway (fatura). */
  gatewayName: string;
  price: number;
  /** Preço "de" (riscado). Sem ele, a oferta mostra só o preço. */
  compareAt?: number;
  img: string;
  /** Chamada curta (uma linha) e o motivo, exibidos no checkout. */
  title: string;
  subtitle: string;
};

export type BumpId = OrderBumpItem["id"];

export const ORDER_BUMPS: readonly OrderBumpItem[] = [
  {
    id: "portalenco",
    name: "+ porta-lenço",
    fullName: "Porta-lenço Mumm Baby (estojo com tampa)",
    gatewayName: "ebook infantil",
    price: 14.9,
    compareAt: 24.9,
    img: "/img/porta-lenco.svg",
    title: "Leve também o porta-lenço",
    subtitle: "Lenços úmidos na bolsa do bebê. Vai no mesmo envio.",
  },
];

/** Bumps escolhidos, na ordem do checkout (ids repetidos ou desconhecidos são ignorados). */
export const getBumps = (ids: readonly string[]) => ORDER_BUMPS.filter((b) => ids.includes(b.id));

/** Soma dos bumps escolhidos, em reais. */
export const bumpsTotal = (ids: readonly string[]) =>
  Math.round(getBumps(ids).reduce((s, b) => s + b.price * 100, 0)) / 100;
