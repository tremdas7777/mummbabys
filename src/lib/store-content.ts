/**
 * Textos da vitrine que mudam com frequência: detalhes do produto, avaliações e perguntas.
 * Preços e itens dos kits ficam em bundles.ts (e no /admin → Preços).
 */

/** Ficha do produto ("Detalhes do produto"). */
export const SPECS = [
  ["Marca", "Mumm Baby"],
  ["Conteúdo", "100 lenços por pacote"],
  ["Tamanho", "19 x 12 cm"],
  ["Fórmula", "Sem álcool etílico, livre de parabenos, com aloe vera"],
  ["Pele", "Extra suave, testado dermatologicamente"],
] as const;

export type Review = { name: string; text: string; img?: string; kit?: string };

/** Avaliações reais de clientes (com foto em public/img/avaliacoes). */
export const REVIEWS: Review[] = [
  {
    name: "Renato",
    text: "Sim, veio certinho. São boas as toalhas, muito cheirosas.",
    img: "/img/avaliacoes/renato.jpg",
  },
  {
    name: "Juliana",
    text: "Excelente compra! Aqui usamos muito os lenços umedecidos, foi um ótimo achado. Qualidade ótima, fragrância suave. Super satisfeita!",
    img: "/img/avaliacoes/juliana.jpg",
  },
  {
    name: "Maria",
    kit: "1.000 lenços",
    text: "Muito bem embalado na caixa, vieram 10 pacotes de lenços umedecidos. Pacotinho bem embalado, com abertura pra retirar os lenços. Cheirosos, qualidade excelente e cor maravilhosa!",
    img: "/img/avaliacoes/maria.jpg",
  },
];

export const RATING = { score: "4,9", sold: "7.975" };

export const FAQ = [
  {
    q: "Quando chega?",
    a: "Sedex em até 2 dias úteis (R$ 14,50), Padrão em até 5 dias úteis (R$ 9,97) ou grátis em até 7 dias úteis no kit de 3.000 lenços.",
  },
  {
    q: "Como ganho frete grátis?",
    a: "Escolhendo o kit de 3.000 lenços. Nos outros kits, você escolhe Padrão ou Sedex.",
  },
  {
    q: "Pode usar em recém-nascido?",
    a: "É sem álcool etílico, livre de parabenos e testado dermatologicamente. [Confirme no rótulo a idade indicada.]",
  },
  {
    q: "Os lenços ressecam?",
    a: "Cada pacote tem tampa. Feche depois de usar e guarde longe do sol.",
  },
  {
    q: "Como pago?",
    a: "Pelo Pix, com aprovação na hora. O pedido é separado assim que o pagamento é confirmado.",
  },
  {
    q: "E se eu me arrepender?",
    a: "Você tem 7 dias depois de receber para pedir a devolução e o reembolso.",
  },
] as const;
