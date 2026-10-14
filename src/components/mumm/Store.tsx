import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  availableBundles,
  brl,
  centsPerWipe,
  getBundle,
  type BundleId,
} from "@/lib/bundles";
import { brand } from "@/lib/brand";
import { GALLERY, VIDEOS } from "@/lib/product-images";
import { FAQ, RATING, REVIEWS, SPECS } from "@/lib/store-content";
import { metaTrack } from "@/lib/meta-pixel";
import { trackCheckoutClick } from "@/lib/analytics";

const TEAL = "#0B5957";

/** Página do produto: galeria, kits, vídeos, avaliações, dúvidas e barra Comprar. */
export function MummStore({
  selected,
  onSelect,
}: {
  selected: BundleId;
  onSelect: (id: BundleId) => void;
}) {
  const bundle = getBundle(selected);
  useEffect(() => {
    metaTrack("ViewContent", { value: bundle.price, contentName: bundle.name });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: BundleId) => {
    if (id === selected) return;
    const b = getBundle(id);
    metaTrack("AddToCart", { value: b.price, contentName: b.name });
    onSelect(id);
  };

  const off = bundle.compareAtPrice
    ? Math.round((1 - bundle.price / bundle.compareAtPrice) * 100)
    : 0;
  const perPack = brl(bundle.price / bundle.packs);
  const wipes = bundle.wipes.toLocaleString("pt-BR");

  return (
    <>
      <div className="wrap top">
        <Gallery />

        <div className="info">
          <section className="card">
            <div className="price-row">
              {off > 0 && <span className="off">-{off}%</span>}
              <span className="price">{brl(bundle.price)}</span>
              {bundle.compareAtPrice && <span className="old">{brl(bundle.compareAtPrice)}</span>}
            </div>
            <p className="per">
              Cada lenço sai por {centsPerWipe(bundle)} centavos · {perPack} o pacote
            </p>
            <h1 className="title">
              {brand.productName} – Kit {bundle.packs} pacotes – {wipes} unidades
            </h1>
            <p className="rating">
              <span className="star">★</span> {RATING.score} · {RATING.sold} vendidos
            </p>
          </section>

          <section className="card">
            <div className="kits-head">
              <h2>Escolha o kit</h2>
              <span>{wipes} lenços</span>
            </div>
            <div className="kits">
              {availableBundles.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="kit"
                  aria-pressed={b.id === selected}
                  onClick={() => pick(b.id)}
                >
                  {b.badge && <span className="badge">{b.badge}</span>}
                  <strong>{b.wipes.toLocaleString("pt-BR")}</strong>
                  <span className="kp">{brl(b.price)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="perks">
              {["7 dias para devolver", "Pagamento seguro", "Pix com aprovação na hora", "Rastreio do pedido"].map(
                (t) => (
                  <span key={t}>
                    <CheckIcon />
                    {t}
                  </span>
                ),
              )}
            </div>
          </section>

          <section className="card">
            <h2>Detalhes do produto</h2>
            <dl className="spec">
              {SPECS.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              {brand.anvisa && (
                <>
                  <dt>ANVISA</dt>
                  <dd>{brand.anvisa}</dd>
                </>
              )}
            </dl>
          </section>
        </div>
      </div>

      <div className="wrap stack">
        <section className="card videos-card">
          <h2>Vídeos</h2>
          <div className="videos">
            {VIDEOS.map((v, i) => (
              <video
                key={v.src}
                src={v.src}
                poster={v.poster}
                controls
                playsInline
                preload="none"
                aria-label={`Vídeo ${i + 1} do produto`}
              />
            ))}
          </div>
        </section>

        {REVIEWS.length > 0 && (
          <section className="card">
            <div className="reviews-head">
              <h2>Avaliações dos clientes</h2>
              <span>
                <span className="star">★</span> {RATING.score}
              </span>
            </div>
            {REVIEWS.map((r) => (
              <article className="review" key={r.name}>
                <strong>{r.name}</strong>
                <span className="stars" role="img" aria-label="5 de 5 estrelas">
                  ★★★★★
                </span>
                {r.kit && <small>Kit: {r.kit}</small>}
                <p>{r.text}</p>
                {r.img && <img src={r.img} alt={`Foto enviada por ${r.name}`} loading="lazy" />}
              </article>
            ))}
          </section>
        )}

        <section className="card" id="duvidas">
          <h2 style={{ marginBottom: 8 }}>Perguntas frequentes</h2>
          <FaqList />
        </section>
      </div>

      <div className="buybar">
        <div className="wrap">
          <Link
            className="buy"
            to="/checkout"
            search={{ plano: bundle.id }}
            onClick={() =>
              trackCheckoutClick({
                source: "buybar",
                bundleId: bundle.id,
                bundleName: bundle.name,
                value: bundle.price,
              })
            }
          >
            <strong>Comprar Agora</strong>
          </Link>
        </div>
      </div>
    </>
  );
}

export function FaqList() {
  return (
    <>
      {FAQ.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </>
  );
}

/** Galeria arrastável (toque e mouse), com setas, contador e miniaturas. */
function Gallery() {
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const total = GALLERY.length;

  const goTo = (i: number) => {
    const el = track.current;
    const n = Math.max(0, Math.min(total - 1, i));
    if (el) el.scrollTo({ left: n * el.clientWidth });
    setIdx(n);
  };

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setIdx(Math.round(el.scrollLeft / el.clientWidth)));
    };
    // Arrastar com o mouse no desktop.
    let drag: { x: number; left: number } | null = null;
    const down = (e: MouseEvent) => {
      drag = { x: e.clientX, left: el.scrollLeft };
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
    };
    const move = (e: MouseEvent) => {
      if (drag) el.scrollLeft = drag.left - (e.clientX - drag.x);
    };
    const up = () => {
      if (!drag) return;
      drag = null;
      el.style.scrollSnapType = "";
      el.style.scrollBehavior = "";
      el.scrollTo({ left: Math.round(el.scrollLeft / el.clientWidth) * el.clientWidth });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div className="gallery">
      <div className="carousel">
        <div className="track" ref={track}>
          {GALLERY.map((g, i) => (
            <img
              key={g.src}
              src={g.src}
              alt={g.alt}
              draggable={false}
              loading={i ? "lazy" : "eager"}
            />
          ))}
        </div>
        <button
          type="button"
          className="arrow prev"
          aria-label="Foto anterior"
          disabled={idx === 0}
          onClick={() => goTo(idx - 1)}
        >
          <Chevron d="m15 18-6-6 6-6" />
        </button>
        <button
          type="button"
          className="arrow next"
          aria-label="Próxima foto"
          disabled={idx === total - 1}
          onClick={() => goTo(idx + 1)}
        >
          <Chevron d="m9 18 6-6-6-6" />
        </button>
        <span className="counter">
          {idx + 1}/{total}
        </span>
      </div>
      <div className="thumbs">
        {GALLERY.map((g, i) => (
          <button
            key={g.src}
            type="button"
            aria-label={`Ver foto ${i + 1}`}
            aria-current={i === idx}
            onClick={() => goTo(i)}
          >
            <img src={g.src} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Chevron({ d }: { d: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1B2B2C"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={TEAL}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
