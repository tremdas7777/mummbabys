import { useNavigate } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import {
  FREE_SHIPPING_LABEL,
  getFreeShippingBundle,
  isFreeShippingEligible,
  type Bundle,
} from "@/lib/bundles";
import { FRETES } from "@/lib/pix.functions";
import { cn } from "@/lib/utils";
import { brl } from "./parts";

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Frete grátis só no kit de 3.000 lenços.
 * - Kit de 3.000: "Você ganhou frete grátis".
 * - Na etapa do frete (`offerUpgrade`), nos outros kits: oferta de trocar para o de 3.000, com a
 *   diferença de preço, os lenços a mais e um botão para trocar.
 * - No resumo lateral: só uma linha curta, sem repetir a oferta.
 */
export function FreeShippingProgress({
  bundle,
  className,
  offerUpgrade = true,
}: {
  bundle: Bundle;
  className?: string;
  /** Mostra a oferta de trocar de kit (etapa do frete). */
  offerUpgrade?: boolean;
}) {
  if (isFreeShippingEligible(bundle)) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-[var(--ck-ok)] bg-[var(--ck-badge)]/40 px-4 py-3 text-[13px]",
          className,
        )}
      >
        <Truck className="h-4 w-4 shrink-0 text-[var(--ck-ok)]" />
        <span>
          Você ganhou <b className="text-[var(--ck-ok)]">FRETE GRÁTIS</b> no kit de 3.000 lenços.
        </span>
      </div>
    );
  }

  if (!offerUpgrade) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px]",
          className,
        )}
      >
        <Truck className="h-4 w-4 shrink-0 text-amber-600" />
        <span>{FREE_SHIPPING_LABEL}.</span>
      </div>
    );
  }

  return <UpgradeOffer bundle={bundle} className={className} />;
}

/** Oferta de troca para o kit com frete grátis (mantém o que o cliente já digitou). */
function UpgradeOffer({ bundle, className }: { bundle: Bundle; className?: string }) {
  const navigate = useNavigate();
  const target = getFreeShippingBundle();
  const extra = round(target.price - bundle.price);
  const moreWipes = (target.wipes - bundle.wipes).toLocaleString("pt-BR");
  const cheapestFrete = Math.min(...FRETES.filter((f) => f.price > 0).map((f) => f.price));

  return (
    <div
      className={cn("rounded-lg border-2 border-[var(--ck-green)] bg-[#fff4ee] p-4 text-[13px]", className)}
    >
      <p className="flex gap-2 leading-snug">
        <Truck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ck-green)]" />
        <span>
          <b className="text-[15px]">Ganhe frete grátis!</b>
          <br />
          Troque para o <b>{target.name}</b>: por só mais <b>{brl(extra)}</b> você leva +
          {moreWipes} lenços e <b className="text-[var(--ck-ok)]">não paga frete</b> (economia de
          pelo menos {brl(cheapestFrete)}).
        </span>
      </p>
      <button
        type="button"
        onClick={() =>
          navigate({ to: "/checkout", search: { plano: target.id }, replace: true, resetScroll: false })
        }
        className="mt-3 flex w-full items-center justify-center rounded-md bg-[var(--ck-green)] px-3 py-3 text-[14px] font-bold text-white transition hover:brightness-95"
      >
        Trocar para o {target.name} e ganhar frete grátis
      </button>
    </div>
  );
}
