import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { CircleCheck, Loader2, ShieldCheck } from "lucide-react";
import { getBundle } from "@/lib/bundles";
import { createUpsellCharge } from "@/lib/pix.functions";
import { loadPixSession, savePixSession, type PixSession } from "@/lib/pix-session";
import {
  SHIPPING_INSURANCE,
  upsellDiscount,
  UPSELL_PACK,
  upsellPrice,
  upsellSelection,
  type UpsellProduct,
} from "@/lib/upsell";
import { brl } from "@/components/checkout/parts";
import { Shell } from "@/components/checkout/OrderShell";

export const Route = createFileRoute("/upsell/$id")({
  head: () => ({
    meta: [{ title: "Oferta especial | Mumm Baby" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

/**
 * Ofertas pós-compra: +1.000 lenços e seguro de entrega.
 * O cliente marca uma, as duas ou nenhuma; o que marcou vai numa cobrança só. Depois (comprando ou
 * não) vem a página do envio expresso — ver /expresso:
 * cobrado num Pix separado.
 */
function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<PixSession | null | undefined>(undefined);
  const createFn = useServerFn(createUpsellCharge);
  const [chosen, setChosen] = useState<UpsellProduct[]>([]);

  useEffect(() => {
    const s = loadPixSession(id);
    // Sem sessão (outro dispositivo) ou já é um upsell: segue para o obrigado.
    if (!s || s.isUpsell) navigate({ to: "/obrigado/$id", params: { id }, replace: true });
    else setSession(s);
  }, [id, navigate]);

  const bundle = getBundle(session?.bundleId);
  const price = upsellPrice(bundle);
  const off = Math.round(upsellDiscount() * 100);
  const sel = upsellSelection(bundle, chosen);
  const withKit = sel.products.includes("kit");

  const toggle = (p: UpsellProduct) =>
    setChosen((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await createFn({
        data: { parentId: id, origin: window.location.origin, products: sel.products },
      });
      return r;
    },
    onSuccess: (c) => {
      if (!session) return;
      savePixSession({
        method: "pix",
        id: c.id,
        qrcode: c.qrcode,
        amount: c.amount,
        email: session.email,
        name: session.name,
        bundleId: bundle.id,
        bundleName: sel.label,
        units: withKit ? bundle.units : 0,
        productPrice: sel.total,
        frete: 0,
        discount: 0,
        createdAt: Date.now(),
        phone: session.phone,
        cpf: session.cpf,
        utm: session.utm,
        fbp: session.fbp,
        fbc: session.fbc,
        isUpsell: true,
        parentId: id,
        upsellItems: sel.products,
      });
      navigate({ to: "/pedido/$id", params: { id: c.id }, replace: true });
    },
  });

  if (!session) {
    return (
      <Shell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--ck-ok)]" />
        </div>
      </Shell>
    );
  }

  const firstName = session.name.trim().split(/\s+/)[0];

  return (
    <Shell>
      <div className="mx-auto max-w-[560px] px-4 pb-20">
        <div className="flex items-center justify-center gap-2 rounded-lg bg-[var(--ck-badge)] px-4 py-3 text-[13px] font-semibold text-[var(--ck-ok)]">
          <CircleCheck className="h-4 w-4 shrink-0" />
          Pagamento aprovado! Seu pedido está confirmado.
        </div>

        <p className="mt-8 text-center text-[13px] font-bold uppercase tracking-wider text-amber-600">
          Espere, {firstName}! Ofertas únicas para você
        </p>
        <h1 className="mt-2 text-center text-[24px] font-bold leading-tight tracking-tight md:text-[28px]">
          Escolha o que adicionar ao seu pedido
        </h1>
        <p className="mt-2 text-center text-[14px] text-muted-foreground">
          Marque uma ou as duas ofertas. Você paga tudo num Pix só.
        </p>

        <Offer checked={chosen.includes("kit")} onToggle={() => toggle("kit")}>
          <div className="flex items-center gap-4">
            <img
              src="/img/kit-1000.jpg"
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-lg border border-border bg-white object-cover"
            />
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--ck-ok)]">
                {off > 0 ? `Só nesta tela: ${off}% OFF` : "Só nesta tela"}
              </p>
              <p className="text-[15px] font-semibold">+ {UPSELL_PACK.fullName}</p>
              <p className="text-[13px] text-muted-foreground">
                10 pacotes de 100 · mesmo envio, sem frete extra
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                {UPSELL_PACK.listPrice > price && (
                  <span className="text-[13px] text-muted-foreground line-through">
                    {brl(UPSELL_PACK.listPrice)}
                  </span>
                )}
                <span className="text-[20px] font-bold text-[var(--ck-ok)]">{brl(price)}</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Lenço umedecido acaba antes do que parece.{" "}
            <b className="text-foreground">Garanta mais 1.000 lenços com desconto</b> e fique
            tranquila por meses. Vai junto com o seu pedido, sem frete extra.
          </p>
        </Offer>

        <Offer checked={chosen.includes("seguro")} onToggle={() => toggle("seguro")}>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-8 w-8 shrink-0 text-[var(--ck-ok)]" />
            <div>
              <p className="text-[15px] font-semibold">{SHIPPING_INSURANCE.name}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Se o seu pedido for extraviado ou chegar danificado, você escolhe:{" "}
                <b className="text-foreground">reenviamos sem custo</b> ou{" "}
                <b className="text-foreground">devolvemos o valor integral</b>.
              </p>
              <p className="mt-1 text-[20px] font-bold text-[var(--ck-ok)]">
                {brl(SHIPPING_INSURANCE.price)}
              </p>
            </div>
          </div>
        </Offer>

        {mutation.isError && (
          <p role="alert" className="mt-4 text-center text-sm text-destructive">
            Não foi possível gerar o Pix agora. Tente novamente em alguns segundos.
          </p>
        )}

        <button
          type="button"
          disabled={mutation.isPending || sel.products.length === 0}
          onClick={() => mutation.mutate()}
          className="mt-6 flex w-full flex-col items-center justify-center rounded-lg bg-[var(--ck-green)] px-6 py-4 text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
        >
          <span className="flex items-center gap-2 text-[17px] font-bold uppercase">
            {mutation.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
            Gerar Pix
          </span>
          <span className="text-[13px] font-medium opacity-90">
            {sel.products.length === 0 ? "Marque uma oferta acima" : `${brl(sel.total)} no Pix`}
          </span>
        </button>

        <Link
          to="/expresso/$id"
          params={{ id }}
          replace
          className="mt-4 block text-center text-[13px] text-muted-foreground underline"
        >
          Não, obrigado. Prefiro pagar o preço cheio depois.
        </Link>
      </div>
    </Shell>
  );
}

/** Cartão de oferta marcável (o cliente escolhe quais quer). */
function Offer({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`mt-5 block cursor-pointer rounded-xl border-2 p-4 transition-colors ${
        checked ? "border-[var(--ck-ok)] bg-[var(--ck-ok)]/[0.04]" : "border-border"
      }`}
    >
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--ck-ok)]"
        />
        <div className="flex-1">{children}</div>
      </div>
    </label>
  );
}
