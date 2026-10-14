/**
 * Regra de preço do checkout (usada no servidor para cobrar e no cliente só para exibir).
 * A loja só recebe Pix (SagacePay, PixGate ou MagicPay): o total é produtos + frete, sem desconto por forma de pagamento.
 */
export function checkoutTotals(o: { products: number; frete: number }) {
  const products = Math.round(o.products * 100);
  const frete = Math.round(o.frete * 100);
  return { products, frete, discount: 0, total: products + frete };
}
