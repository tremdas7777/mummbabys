# Mumm Baby — loja de lenços umedecidos

Loja da Mumm Baby feita a partir do sistema próprio da CardioMed/GlicoMax: painel `/admin` com
pedidos, lucro, checkouts abandonados, preços e integrações; checkout Pix em 3 etapas, order bump,
upsell, envio expresso, UTMify, Meta (Pixel + API de Conversões), Pushcut e rastreio (Rotasync).

**Pagamento: Pix, pela SagacePay, PixGate ou MagicPay.** No `/admin` → Integrações você escolhe
qual gera os próximos Pix (padrão: SagacePay). O webhook dos gateways é `/api/public/pix-webhook`.

## Antes de publicar

- **Banco**: ative o Lovable Cloud **neste projeto** (banco novo, não use o da CardioMed) e rode as
  migrações de `supabase/migrations`.
- **Segredos** (Lovable Cloud): `ADMIN_PASSWORD` (senha do `/admin`), `RASTREIO_API_KEY` (Rotasync;
  opcional `RASTREIO_API_URL`). As chaves da SagacePay, PixGate e MagicPay, a UTMify, o Meta e o
  Pushcut são cadastrados no `/admin` → Integrações.
- **Marca e empresa**: `src/lib/brand.ts` (razão social, CNPJ, e-mail, domínio, WhatsApp).
- **Kits e preços**: `src/lib/bundles.ts` (1.000, 2.000 e 3.000 lenços) · **order bump** (porta-lenço):
  `src/lib/order-bump.ts` · **upsell** (+1.000 lenços, seguro, expresso): `src/lib/upsell.ts`.
  Todos os preços também mudam no `/admin` → Preços.
- **Frete**: opções em `src/lib/pix.functions.ts` (`FRETES`); grátis a partir de
  `FREE_SHIPPING_MIN` em `src/lib/bundles.ts`.
- **Textos da vitrine** (ficha, avaliações, dúvidas): `src/lib/store-content.ts`.
- **Fotos e vídeos**: `public/img` e `public/video` (lista em `src/lib/product-images.ts`).
- **Pixels do `<head>`**: `src/lib/pixels.ts` (Meta, TikTok, UTMify).
- **Visual**: `src/components/mumm/mumm.css` (vitrine) e o bloco `.ck` em `src/styles.css` (checkout).

## Desenvolvimento

```sh
npm i
npm run dev
```
<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
