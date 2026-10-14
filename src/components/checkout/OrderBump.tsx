import { useEffect, useRef, useState } from "react";
import type { OrderBumpItem } from "@/lib/order-bump";
import { cn } from "@/lib/utils";
import { brl } from "./parts";

/** Surge (aparece e sobe) quando o cliente rola até o elemento. Sem suporte, já fica visível. */
function useReveal(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(!enabled);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === "undefined") return setShown(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return { ref, shown };
}

/** Oferta adicional (order bump) logo acima do botão de finalizar. */
export function OrderBump({
  bump,
  checked,
  onChange,
  reveal = false,
}: {
  bump: OrderBumpItem;
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Surge com animação quando o cliente rola até ele (usado do segundo bump em diante). */
  reveal?: boolean;
}) {
  const { ref, shown } = useReveal(reveal);
  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,translate] duration-700 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
      )}
    >
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors",
          checked
            ? "border-[var(--ck-ok)] bg-[var(--ck-ok)]/[0.05]"
            : "border-[var(--ck-green)] bg-[#fff4ee]",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[var(--ck-ok)]"
          aria-label={`Adicionar ${bump.fullName} por ${brl(bump.price)}`}
        />
        <img
          src={bump.img}
          alt=""
          width={52}
          height={52}
          loading="lazy"
          className="h-[52px] w-[52px] shrink-0 rounded-md border border-border bg-white object-contain"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold leading-snug">
            {checked ? "Adicionado ao pedido!" : bump.title}
          </span>
          <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
            {bump.subtitle}
          </span>
        </span>
        <span className="shrink-0 text-right leading-tight">
          {bump.compareAt && (
            <span className="block text-[11px] text-muted-foreground line-through">
              {brl(bump.compareAt)}
            </span>
          )}
          <span className="block text-[15px] font-extrabold text-[var(--ck-ok)]">
            +{brl(bump.price)}
          </span>
        </span>
      </label>
    </div>
  );
}
