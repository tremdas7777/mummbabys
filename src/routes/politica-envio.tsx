import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/site/PolicyPage";

export const Route = createFileRoute("/politica-envio")({
  head: () => ({
    meta: [
      { title: "Política de Envio | Mumm Baby" },
      { name: "description", content: "Saiba como funciona o envio dos pedidos Mumm Baby." },
      { property: "og:title", content: "Política de Envio" },
      { property: "og:description", content: "Envio para todo o Brasil com rastreamento." },
      { property: "og:url", content: "/politica-envio" },
    ],
    links: [{ rel: "canonical", href: "/politica-envio" }],
  }),
  component: () => (
    <PolicyPage title="Política de Envio" intro="Enviamos para todo o Brasil com rastreamento.">
      <h2>Prazo de envio</h2>
      <p>Os pedidos são processados em até 1 dia útil após confirmação do pagamento.</p>
      <h2>Prazo de entrega</h2>
      <p>
        O prazo depende da região e do frete escolhido, e aparece no checkout antes do pagamento.
      </p>
      <h2>Rastreamento</h2>
      <p>
        Assim que o pedido for postado, o código de rastreio aparece na página Rastrear pedido,
        consultada pelo CPF usado na compra.
      </p>
      <h2>Frete</h2>
      <p>
        O frete é grátis para todo o Brasil no kit de 3.000 lenços. Nos outros kits, você escolhe no
        checkout entre o Frete Padrão e o Sedex, com o valor exibido antes do pagamento.
      </p>
    </PolicyPage>
  ),
});
