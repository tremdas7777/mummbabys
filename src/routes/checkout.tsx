import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/site/BrandLogo";
import { getBundle, isFreeShippingEligible, FREE_SHIPPING_LABEL } from "@/lib/bundles";
import { bundleIdFromSearch, planSearchSchema } from "@/lib/plan-search";
import { createPixCharge, FRETES, getFrete, type FreteId } from "@/lib/pix.functions";
import { checkoutTotals } from "@/lib/payment-pricing";
import { savePixSession } from "@/lib/pix-session";
import { getSessionId, getStoredUtms } from "@/lib/tracking";
import { trackCheckoutStep, type CheckoutStep } from "@/lib/checkout-tracking.functions";
import { getMetaCookies, metaTrack } from "@/lib/meta-pixel";
import { trackCheckoutClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  brl,
  Card,
  CardHead,
  CheckoutFooter,
  Field,
  GreenButton,
  PixIcon,
} from "@/components/checkout/parts";
import { SummaryDesktop, SummaryMobile } from "@/components/checkout/Summary";
import { OrderBump } from "@/components/checkout/OrderBump";
import { FreeShippingProgress } from "@/components/checkout/FreeShippingProgress";
import { ORDER_BUMPS, bumpsTotal, getBumps, type BumpId } from "@/lib/order-bump";

export const Route = createFileRoute("/checkout")({
  validateSearch: planSearchSchema,
  head: () => ({
    meta: [
      { title: "Checkout Seguro | Mumm Baby" },
      {
        name: "description",
        content: `Finalize sua compra Mumm Baby com segurança. Pagamento seguro via Pix. ${FREE_SHIPPING_LABEL}.`,
      },
      { property: "og:title", content: "Checkout Seguro | Mumm Baby" },
      {
        property: "og:description",
        content: `Pagamento seguro via Pix. ${FREE_SHIPPING_LABEL}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

const digits = (v: string) => v.replace(/\D/g, "");
const maskCpf = (v: string) =>
  digits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskPhone = (v: string) =>
  digits(v)
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
const maskCep = (v: string) =>
  digits(v)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
type Step = 1 | 2 | 3;

const DRAFT_KEY = "checkout_draft";
/** Rascunho mais velho que isso é descartado. */
const DRAFT_MAX_AGE_MS = 2 * 60 * 60 * 1000;
type Draft = {
  id: { name: string; email: string; cpf: string; phone: string };
  addr: Addr;
  bumps: BumpId[];
  step: Step;
  at: number;
};
type Addr = {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  complemento: string;
  cidade: string;
  uf: string;
};

function Page() {
  const navigate = useNavigate();
  const bundle = getBundle(bundleIdFromSearch(Route.useSearch()));
  useEffect(() => {
    metaTrack("InitiateCheckout", { value: bundle.price, contentName: bundle.name });
  }, [bundle.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [step, setStep] = useState<Step>(1);
  const [id, setId] = useState({ name: "", email: "", cpf: "", phone: "" });
  const [addr, setAddr] = useState<Addr>({
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    complemento: "",
    cidade: "",
    uf: "",
  });
  const [bumps, setBumps] = useState<BumpId[]>([]);

  // Rascunho do checkout nesta aba: se a página for recriada (troca de kit, recarregar),
  // o cliente não precisa digitar tudo de novo. Apagado quando o Pix é gerado.
  const restored = useRef(false);
  useEffect(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as Draft | null;
      if (d && Date.now() - d.at < DRAFT_MAX_AGE_MS) {
        setId(d.id);
        setAddr(d.addr);
        setBumps(d.bumps.filter((b) => ORDER_BUMPS.some((o) => o.id === b)));
        setStep(d.step);
      }
    } catch {
      // storage indisponível ou rascunho inválido: segue com o formulário vazio
    }
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try {
      const d: Draft = { id, addr, bumps, step, at: Date.now() };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      // storage indisponível
    }
  }, [id, addr, bumps, step]);

  const toggleBump = (id: BumpId, on: boolean) =>
    setBumps((cur) => (on ? [...cur.filter((b) => b !== id), id] : cur.filter((b) => b !== id)));
  // Frete grátis só no kit de 3.000 lenços (validado também no servidor).
  const freeEligible = isFreeShippingEligible(bundle);
  const [frete, setFrete] = useState<FreteId>(() => (freeEligible ? "gratis" : "padrao"));
  const wasEligible = useRef(freeEligible);
  useEffect(() => {
    if (!freeEligible && frete === "gratis") setFrete("padrao");
    // Acabou de liberar o frete grátis (ex.: trocou de plano): já seleciona para o cliente.
    if (freeEligible && !wasEligible.current) setFrete("gratis");
    wasEligible.current = freeEligible;
  }, [freeEligible, frete]);
  const createFn = useServerFn(createPixCharge);
  const stepFn = useServerFn(trackCheckoutStep);

  const freteOpt = getFrete(frete);
  const freteValue = freteOpt.price;
  const products = bundle.price + bumpsTotal(bumps);
  // Só Pix (SagacePay, PixGate ou MagicPay): o servidor aplica a mesma regra de preço.
  const pixT = checkoutTotals({ products, frete: freteValue });
  const pixTotal = pixT.total / 100;
  const payTotal = pixTotal;
  const discount = 0;

  // Busca de endereço pelo CEP (ViaCEP, API pública)
  useEffect(() => {
    const c = digits(addr.cep);
    if (c.length !== 8) return;
    let alive = true;
    fetch(`https://viacep.com.br/ws/${c}/json/`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive || j.erro) return;
        setAddr((a) => ({
          ...a,
          rua: a.rua || j.logradouro,
          bairro: a.bairro || j.bairro,
          cidade: j.localidade,
          uf: j.uf,
        }));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [addr.cep]);

  // Registra cada etapa para a aba "Checkouts abandonados" do admin (nunca bloqueia a compra).
  const track = (s: CheckoutStep, extra: { pixId?: string } = {}) => {
    void stepFn({
      data: {
        sessionId: getSessionId(),
        step: s,
        plano: bundle.id,
        planoNome: bundle.name,
        value: payTotal,
        utm: getStoredUtms(),
        ...(s !== "checkout"
          ? {
              name: id.name,
              email: id.email,
              phone: id.phone,
              bump: bumps.length > 0,
              bumps: getBumps(bumps).map((b) => b.name),
              frete,
            }
          : {}),
        ...(s === "entrega" || s === "pix" ? { cidade: addr.cidade, uf: addr.uf } : {}),
        ...extra,
      },
    }).catch(() => undefined);
  };
  useEffect(() => {
    track("checkout");
  }, [bundle.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const idValid =
    id.name.trim().split(" ").length >= 2 &&
    emailOk(id.email) &&
    digits(id.cpf).length === 11 &&
    digits(id.phone).length >= 10;
  const addrValid = digits(addr.cep).length === 8 && addr.rua && addr.numero && addr.bairro;

  // Por partes para a RastroCode; só vai se o CEP trouxe cidade/UF (nunca trava o Pix).
  const structuredAddress = () =>
    addr.cidade.trim() && addr.uf.trim().length === 2 && digits(addr.cep).length === 8
      ? {
          street: addr.rua.trim(),
          number: addr.numero.trim(),
          ...(addr.complemento.trim() ? { complement: addr.complemento.trim() } : {}),
          neighborhood: addr.bairro.trim(),
          city: addr.cidade.trim(),
          state: addr.uf.trim(),
          zipcode: digits(addr.cep),
        }
      : undefined;
  const orderPayload = () => ({
    ...id,
    plano: bundle.id,
    frete,
    bumps,
    origin: window.location.origin,
    utm: getStoredUtms(),
    endereco: `${addr.rua}, ${addr.numero} ${addr.complemento} - ${addr.bairro}, ${addr.cidade}/${addr.uf} ${addr.cep}`,
    address: structuredAddress(),
  });
  const sessionBase = () => ({
    email: id.email,
    name: id.name,
    bundleId: bundle.id,
    bundleName: bundle.name,
    units: bundle.units,
    productPrice: bundle.price,
    bumps: getBumps(bumps).map((b) => ({ name: b.fullName, price: b.price })),
    frete: freteValue,
    createdAt: Date.now(),
    phone: id.phone.replace(/\D/g, ""),
    cpf: id.cpf.replace(/\D/g, ""),
    utm: getStoredUtms(),
    ...getMetaCookies(),
  });

  const mutation = useMutation({
    mutationFn: () => createFn({ data: orderPayload() }),
    onSuccess: (c) => {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // storage indisponível
      }
      savePixSession({
        ...sessionBase(),
        id: c.id,
        qrcode: c.qrcode,
        amount: c.amount,
        discount: 0,
        method: "pix",
      });
      metaTrack("AddPaymentInfo", { value: pixTotal, contentName: bundle.name });
      trackCheckoutClick({
        source: "pix_generated",
        bundleId: bundle.id,
        bundleName: bundle.name,
        value: pixTotal,
      });
      track("pix", { pixId: c.id });
      navigate({ to: "/pedido/$id", params: { id: c.id }, replace: true });
    },
  });

  const submitId = (e: FormEvent) => {
    e.preventDefault();
    if (idValid) {
      track("dados");
      setStep(addrValid ? 3 : 2);
    }
  };
  const submitAddr = (e: FormEvent) => {
    e.preventDefault();
    if (addrValid) {
      track("entrega");
      setStep(3);
    }
  };

  const idCard =
    step === 1 ? (
      <Card>
        <CardHead
          title="Identificação"
          step="1 de 3"
          sub="Preencha seus dados para envio do pedido."
        />
        <form onSubmit={submitId} className="mt-6 space-y-4">
          <Field
            label="Nome completo"
            autoComplete="name"
            required
            value={id.name}
            ok={id.name.trim().split(" ").length >= 2}
            onChange={(e) => setId({ ...id, name: e.target.value })}
          />
          <Field
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            value={id.email}
            ok={emailOk(id.email)}
            onChange={(e) => setId({ ...id, email: e.target.value })}
          />
          <Field
            label="CPF"
            wrap="sm:max-w-[240px]"
            inputMode="numeric"
            required
            value={id.cpf}
            ok={digits(id.cpf).length === 11}
            onChange={(e) => setId({ ...id, cpf: maskCpf(e.target.value) })}
          />
          <Field
            label="Celular/Whatsapp"
            wrap="sm:max-w-[240px]"
            prefix="+55"
            inputMode="tel"
            required
            value={id.phone}
            ok={digits(id.phone).length >= 10}
            onChange={(e) => setId({ ...id, phone: maskPhone(e.target.value) })}
          />
          <GreenButton type="submit" disabled={!idValid}>
            Ir Para Entrega
          </GreenButton>
        </form>
      </Card>
    ) : (
      <Card done>
        <CardHead title="Identificação" onEdit={() => setStep(1)} />
        <p className="mt-3 text-[13px] font-semibold">{id.name}</p>
        <p className="mt-1 text-[13px]">{id.email}</p>
        <p className="mt-1 text-[13px]">{id.phone}</p>
      </Card>
    );

  const addrCard =
    step === 2 ? (
      <Card>
        <CardHead title="Entrega" step="2 de 3" sub="Informe o endereço de entrega" />
        <form onSubmit={submitAddr} className="mt-6 space-y-4">
          <div className="flex items-end gap-4">
            <Field
              label="CEP"
              wrap="w-2/3"
              inputMode="numeric"
              required
              value={addr.cep}
              ok={digits(addr.cep).length === 8}
              onChange={(e) => setAddr({ ...addr, cep: maskCep(e.target.value) })}
            />
            {addr.uf && (
              <span className="pb-3.5 text-xs">
                {addr.uf}/{addr.cidade}
              </span>
            )}
          </div>
          <Field
            label="Endereço"
            required
            value={addr.rua}
            ok={!!addr.rua}
            onChange={(e) => setAddr({ ...addr, rua: e.target.value })}
          />
          <div className="flex gap-2">
            <Field
              label="N°"
              wrap="w-1/4"
              required
              value={addr.numero}
              ok={!!addr.numero}
              onChange={(e) => setAddr({ ...addr, numero: e.target.value })}
            />
            <Field
              label="Bairro"
              wrap="flex-1"
              required
              value={addr.bairro}
              ok={!!addr.bairro}
              onChange={(e) => setAddr({ ...addr, bairro: e.target.value })}
            />
          </div>
          <Field
            label={
              <>
                Complemento <span className="text-[11px] text-muted-foreground">(Opcional)</span>
              </>
            }
            value={addr.complemento}
            onChange={(e) => setAddr({ ...addr, complemento: e.target.value })}
          />
          <p className="pt-2 text-base font-medium">Escolha o frete:</p>
          <FreeShippingProgress bundle={bundle} />
          {FRETES.filter((f) => f.id !== "gratis" || freeEligible).map(
            ({ id: v, name: t, eta: d, price }) => {
              const p = price ? brl(price) : "Grátis";
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFrete(v)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-lg border px-4 py-5 text-left",
                    frete === v ? "border-[var(--ck-blue)] bg-muted/60" : "border-border",
                  )}
                >
                  <Radio on={frete === v} />
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium">{t}</span>
                    <span className="text-[11px] text-muted-foreground">{d}</span>
                  </span>
                  <span className="text-[13px] font-semibold">{p}</span>
                </button>
              );
            },
          )}
          <GreenButton type="submit" disabled={!addrValid}>
            Ir Para Pagamento
          </GreenButton>
        </form>
      </Card>
    ) : step === 3 ? (
      <Card done>
        <CardHead title="Enviar para" onEdit={() => setStep(2)} />
        <p className="mt-3 text-[13px]">
          {addr.rua}, {addr.numero}
          {addr.complemento && ` - ${addr.complemento}`}
        </p>
        <p className="mt-1 text-[13px]">
          {addr.bairro}, {addr.cidade}/{addr.uf} {addr.cep}
        </p>
        <p className="mt-4 text-[13px] font-semibold">Frete selecionado</p>
        <p className="text-[13px]">
          {freteOpt.name} - {freteValue ? brl(freteValue) : "Grátis"}
        </p>
      </Card>
    ) : (
      <Card muted>
        <CardHead
          title="Entrega"
          step="2 de 3"
          sub="Preencha os dados pessoais para continuar"
          muted
        />
      </Card>
    );

  const payCard =
    step < 3 ? (
      <Card muted={step === 1}>
        <CardHead
          title="Pagamento"
          step="3 de 3"
          muted={step === 1}
          sub={
            step === 1
              ? "Preencha os dados de entrega para continuar"
              : "Todas as transações são seguras e criptografadas."
          }
        />
      </Card>
    ) : (
      <Card>
        <CardHead
          title="Pagamento"
          step="3 de 3"
          sub="Todas as transações são seguras e criptografadas."
        />
        <div className="mt-6 space-y-6">
          {ORDER_BUMPS.map((b, i) => (
            <OrderBump
              key={b.id}
              bump={b}
              reveal={i > 0}
              checked={bumps.includes(b.id)}
              onChange={(on) => toggleBump(b.id, on)}
            />
          ))}
          <div className="rounded-lg border border-[var(--ck-blue)] bg-muted/60">
            <div className="flex w-full items-center gap-3 p-3 text-left">
              <Radio on />
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <PixIcon className="h-5 w-5" />
              </span>
              <span className="flex-1 text-[15px]">PIX</span>
              <span className="rounded bg-[var(--ck-badge)] px-2 py-0.5 text-[11px] font-bold uppercase text-[var(--ck-ok)]">
                Aprovação na hora
              </span>
            </div>
            <div className="px-3 pb-3">
              <p className="px-4 pt-4 text-sm text-muted-foreground">
                O código Pix expira em 30 minutos após finalizar a compra. O pedido é separado assim
                que o pagamento é confirmado.
              </p>
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Valor no Pix: <b className="text-[var(--ck-green)]">{brl(pixTotal)}</b>
              </p>
              {mutation.isError && (
                <p role="alert" className="px-4 pb-3 text-sm text-destructive">
                  Não foi possível gerar o Pix agora. Confira seus dados e tente novamente.
                </p>
              )}
              <GreenButton
                type="button"
                className="bg-[var(--ck-green)]"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Finalizar
                Compra
              </GreenButton>
            </div>
          </div>
        </div>
      </Card>
    );

  return (
    <div className="ck flex min-h-screen flex-col text-foreground">
      <header className="flex justify-center py-6 md:py-10">
        <BrandLogo className="text-4xl md:text-5xl" />
      </header>
      <SummaryMobile bundle={bundle} frete={freteValue} discount={discount} bumps={bumps} />
      <main className="mx-auto grid w-full max-w-[1160px] gap-4 px-3 pb-24 pt-2 md:px-4 lg:grid-cols-3 lg:gap-4">
        <div className="space-y-5">
          {idCard}
          {addrCard}
        </div>
        <div>{payCard}</div>
        <SummaryDesktop bundle={bundle} frete={freteValue} discount={discount} bumps={bumps} />
      </main>
      <CheckoutFooter />
    </div>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border",
        on ? "border-[var(--ck-blue)]" : "border-muted-foreground/50",
      )}
    >
      {on && <span className="h-2.5 w-2.5 rounded-full bg-[var(--ck-blue)]" />}
    </span>
  );
}
