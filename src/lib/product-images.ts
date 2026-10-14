/** Fotos do produto (em public/img). */
export const productHeroImage = "/img/kit-1000.jpg";
export const productKitImage = "/img/10-pacotes.jpg";

/** Galeria da página do produto, na ordem. */
export const GALLERY = [
  { src: "/img/kit-1000.jpg", alt: "1.000 toalhas umedecidas Mumm Baby, 10 pacotes de 100" },
  { src: "/img/beneficios.jpg", alt: "Benefícios Mumm Baby para a pele do bebê" },
  { src: "/img/cuidado.jpg", alt: "Pacote Mumm Baby: sem álcool, aloe vera, extra suave" },
  { src: "/img/suavidade.jpg", alt: "Pacote Mumm Baby: livre de parabenos, testado dermatologicamente" },
  { src: "/img/10-pacotes.jpg", alt: "Os 10 pacotes Mumm Baby" },
  { src: "/img/bolsa.jpg", alt: "Pacote Mumm Baby na bolsa do bebê" },
] as const;

/** Vídeos do produto (em public/video). */
export const VIDEOS = [1, 2, 3, 4, 5].map((n) => ({
  src: `/video/video-${n}.mp4`,
  poster: `/video/capa-${n}.jpg`,
}));
