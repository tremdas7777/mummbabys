import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getGoogleAdsAdmin, saveGoogleAdsAdmin } from "@/lib/google-ads.functions";

export interface GoogleAdsCardProps {
  password: string;
}

type Labels = { purchaseLabel: string; checkoutLabel: string; pixLabel: string };

/** ID "AW-..." a partir do que foi digitado (só números ganham o "AW-"). */
function normalizeId(v: string) {
  const id = v.trim().toUpperCase();
  return /^\d+$/.test(id) ? `AW-${id}` : id;
}

/** Configuração da tag do Google Ads (ID + rótulos de conversão). */
export function GoogleAdsCard({ password }: GoogleAdsCardProps) {
  const loadFn = useServerFn(getGoogleAdsAdmin);
  const saveFn = useServerFn(saveGoogleAdsAdmin);
  const [adsId, setAdsId] = useState("");
  const [labels, setLabels] = useState<Labels>({
    purchaseLabel: "",
    checkoutLabel: "",
    pixLabel: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!password) return;
    loadFn({ data: { password } })
      .then((r) => {
        setAdsId(r.adsId);
        setLabels({
          purchaseLabel: r.purchaseLabel,
          checkoutLabel: r.checkoutLabel,
          pixLabel: r.pixLabel,
        });
      })
      .catch(() => setMsg("Não foi possível carregar."));
  }, [password, loadFn]);

  // Aceita o send_to inteiro colado ("AW-123456789/AbCdEf") em qualquer campo.
  const onId = (v: string) => {
    const [id, label] = v.split("/");
    setAdsId(normalizeId(id ?? ""));
    if (label !== undefined && !labels.purchaseLabel)
      setLabels((l) => ({ ...l, purchaseLabel: label.trim() }));
  };
  const onLabel = (k: keyof Labels) => (v: string) => {
    const [id, label] = v.split("/");
    if (label !== undefined && !adsId) setAdsId(normalizeId(id ?? ""));
    setLabels((l) => ({ ...l, [k]: (label ?? v).trim() }));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await saveFn({ data: { password, adsId, ...labels } });
      setMsg(
        adsId
          ? "Salvo. A tag já vale para todas as páginas da loja."
          : "Salvo. Tag do Google Ads desligada.",
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof Labels, title: string) => (
    <label className="text-xs text-muted-foreground space-y-1">
      <span>{title}</span>
      <Input
        value={labels[k]}
        onChange={(e) => onLabel(k)(e.target.value)}
        placeholder="AbCdEfGhIjK"
        autoComplete="off"
      />
    </label>
  );

  return (
    <Card className="mt-3 p-5">
      <div className="flex items-center gap-3 mb-4">
        <Megaphone className="w-5 h-5 text-muted-foreground" aria-hidden />
        <div>
          <div className="font-medium">Google Ads</div>
          <div className="text-xs text-muted-foreground">
            Tag do Google (gtag.js) em todas as páginas e conversão de compra quando o Pix é pago.
          </div>
        </div>
      </div>
      <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-muted-foreground space-y-1">
          <span>ID da tag</span>
          <Input
            value={adsId}
            onChange={(e) => onId(e.target.value)}
            placeholder="AW-123456789"
            autoComplete="off"
          />
        </label>
        {field("purchaseLabel", "Rótulo da conversão Compra")}
        {field("checkoutLabel", "Rótulo Iniciar checkout (opcional)")}
        {field("pixLabel", "Rótulo Pix gerado (opcional)")}
        <p className="md:col-span-2 text-xs text-muted-foreground">
          No Google Ads: Metas &gt; Conversões &gt; abra a conversão &gt; Configuração da tag &gt;
          Instalar a tag você mesmo. O trecho do evento traz{" "}
          <code>send_to: 'AW-123456789/AbCdEf'</code>: pode colar ele inteiro aqui. Para desligar,
          apague o ID e salve.
        </p>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={busy}>
            Salvar
          </Button>
          {msg && <span className="text-xs text-foreground">{msg}</span>}
        </div>
      </form>
    </Card>
  );
}
