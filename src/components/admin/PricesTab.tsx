import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { bundles, brl } from "@/lib/bundles";
import { ORDER_BUMPS } from "@/lib/order-bump";
import { EXPRESS_SHIPPING, SHIPPING_INSURANCE, UPSELL_PACK } from "@/lib/upsell";
import { DEFAULT_PRICES, priceConfigSchema, type PriceConfig } from "@/lib/prices";
import { getPrices, resetPrices, savePrices } from "@/lib/prices.functions";

/** Campo de dinheiro em texto ("6.490,00"), para digitar como no Brasil. */
type Draft = Record<string, string>;

const fmt = (n: number | null | undefined) =>
  n == null
    ? ""
    : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "6.490,00" / "6490" / "6490.5" → número (ou null se vazio). */
function parse(v: string): number | null {
  const t = v.trim().replace(/[R$\s]/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

function toDraft(p: PriceConfig): Draft {
  return {
    k1: fmt(p.bundles["1"].price),
    k1de: fmt(p.bundles["1"].compareAt),
    k2: fmt(p.bundles["2"].price),
    k2de: fmt(p.bundles["2"].compareAt),
    k3: fmt(p.bundles["3"].price),
    k3de: fmt(p.bundles["3"].compareAt),
    bump: fmt(p.bump.price),
    bumpde: fmt(p.bump.compareAt),
    upsell: fmt(p.upsell.price),
    upsellde: fmt(p.upsell.compareAt),
    seguro: fmt(p.seguro),
    expresso: fmt(p.expresso),
  };
}

function fromDraft(d: Draft) {
  const n = (k: string) => parse(d[k] ?? "");
  const offer = (a: string, b: string) => ({ price: n(a) ?? NaN, compareAt: n(b) });
  return {
    bundles: { "1": offer("k1", "k1de"), "2": offer("k2", "k2de"), "3": offer("k3", "k3de") },
    bump: offer("bump", "bumpde"),
    upsell: offer("upsell", "upsellde"),
    seguro: n("seguro") ?? NaN,
    expresso: n("expresso") ?? NaN,
  };
}

/** Aba de preços: ticket de cada kit, oferta do checkout, upsell, seguro e envio expresso. */
export function PricesTab({ password }: { password: string }) {
  const loadFn = useServerFn(getPrices);
  const saveFn = useServerFn(savePrices);
  const resetFn = useServerFn(resetPrices);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () =>
    loadFn()
      .then((p) => {
        const d = toDraft(p);
        setDraft(d);
        setSaved(d);
      })
      .catch(() => setMsg({ ok: false, text: "Não foi possível carregar os preços." }));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft) return <p className="text-sm text-muted-foreground">Carregando preços…</p>;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [k]: e.target.value });
  const check = priceConfigSchema.safeParse(fromDraft(draft));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = async () => {
    if (!check.success) return;
    setBusy(true);
    setMsg(null);
    try {
      const p = await saveFn({ data: { password, prices: check.data } });
      const d = toDraft(p);
      setDraft(d);
      setSaved(d);
      setMsg({
        ok: true,
        text: "Preços salvos. A loja, o checkout e as cobranças já usam os novos valores.",
      });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!confirm("Voltar todos os preços aos valores de fábrica?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const p = await resetFn({ data: { password } });
      const d = toDraft(p);
      setDraft(d);
      setSaved(d);
      setMsg({ ok: true, text: "Preços de fábrica restaurados." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível restaurar." });
    } finally {
      setBusy(false);
    }
  };

  const bump = ORDER_BUMPS[0];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Preços (ticket)</h2>
        <p className="text-sm text-muted-foreground">
          O valor salvo aqui é o que a loja mostra e o que é cobrado no Pix (SagacePay, PixGate ou MagicPay).
          Pix já gerados continuam com o valor da hora em que foram criados. O preço "de" é o valor
          riscado; deixe vazio para não mostrar desconto.
        </p>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 font-medium">Kits</h3>
        <div className="space-y-4">
          {bundles.map((b) => (
            <Row
              key={b.id}
              title={b.name}
              sub={b.description}
              price={draft[`k${b.id}`]!}
              de={draft[`k${b.id}de`]!}
              onPrice={set(`k${b.id}`)}
              onDe={set(`k${b.id}de`)}
              fallback={DEFAULT_PRICES.bundles[b.id]}
            />
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 font-medium">Ofertas</h3>
        <div className="space-y-4">
          {bump && (
            <Row
              title="Oferta do checkout (order bump)"
              sub={bump.fullName}
              price={draft.bump!}
              de={draft.bumpde!}
              onPrice={set("bump")}
              onDe={set("bumpde")}
              fallback={DEFAULT_PRICES.bump}
            />
          )}
          <Row
            title="Upsell depois da compra"
            sub={UPSELL_PACK.name}
            price={draft.upsell!}
            de={draft.upsellde!}
            onPrice={set("upsell")}
            onDe={set("upsellde")}
            fallback={DEFAULT_PRICES.upsell}
          />
          <Row
            title={SHIPPING_INSURANCE.name}
            sub="Oferecido na tela depois da compra"
            price={draft.seguro!}
            onPrice={set("seguro")}
            fallback={{ price: DEFAULT_PRICES.seguro, compareAt: null }}
          />
          <Row
            title={EXPRESS_SHIPPING.name}
            sub="Página própria depois das ofertas"
            price={draft.expresso!}
            onPrice={set("expresso")}
            fallback={{ price: DEFAULT_PRICES.expresso, compareAt: null }}
          />
        </div>
      </Card>

      {!check.success && (
        <p className="text-sm text-destructive">
          {check.error.issues.find((i) => i.message.startsWith('O preço "de"'))?.message ??
            "Confira os valores: todo preço precisa ser um número maior que zero."}
        </p>
      )}
      {msg && (
        <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-destructive"}`}>{msg.text}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !dirty || !check.success} onClick={save}>
          {busy ? "Salvando…" : "Salvar preços"}
        </Button>
        <Button variant="outline" disabled={busy || !dirty} onClick={() => setDraft(saved)}>
          Desfazer alterações
        </Button>
        <Button variant="ghost" disabled={busy} onClick={reset}>
          Voltar aos preços de fábrica
        </Button>
      </div>
    </div>
  );
}

function Row(p: {
  title: string;
  sub: string;
  price: string;
  de?: string;
  onPrice: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDe?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fallback: { price: number; compareAt: number | null };
}) {
  const price = parse(p.price);
  const de = p.de === undefined ? null : parse(p.de);
  const off =
    price && de && Number.isFinite(price) && Number.isFinite(de) && de > price
      ? Math.round((1 - price / de) * 100)
      : null;
  return (
    <div className="grid gap-3 border-b pb-4 last:border-0 last:pb-0 md:grid-cols-[1fr_160px_160px_90px] md:items-end">
      <div>
        <div className="text-sm font-medium">{p.title}</div>
        <div className="text-xs text-muted-foreground">
          {p.sub} · padrão {brl(p.fallback.price)}
        </div>
      </div>
      <label className="text-xs text-muted-foreground">
        Preço de venda (R$)
        <Input inputMode="decimal" value={p.price} onChange={p.onPrice} className="mt-1" />
      </label>
      {p.onDe ? (
        <label className="text-xs text-muted-foreground">
          Preço "de" (R$)
          <Input
            inputMode="decimal"
            value={p.de}
            onChange={p.onDe}
            placeholder="sem desconto"
            className="mt-1"
          />
        </label>
      ) : (
        <span />
      )}
      <span className="text-sm text-emerald-600">{off ? `${off}% off` : ""}</span>
    </div>
  );
}
