import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { University } from "../lib/types";
import { fixAccents } from "../lib/utils";

function buildUnsplashUrl(query: string) {
  return `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`;
}

function buildAvatarDataUrl(name: string) {
  const letter = (name || "U").trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#cbd5e1"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="220" fill="#0f172a" opacity="0.7">${letter}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export default function UniversityCarousel({
  u,
  aspect = "video",
  autoMs = 4500,
  compact = false
}: {
  u: University;
  aspect?: "video" | "square";
  autoMs?: number;
  compact?: boolean;
}) {
  const name = fixAccents(u.name);
  const images = useMemo(() => {
    const list: string[] = [];
    // If dataset already has photos, prefer them
    // @ts-expect-error optional field
    const photos: string[] | undefined = (u as any).photos;
    if (Array.isArray(photos)) {
      for (const p of photos) if (typeof p === "string" && p.trim()) list.push(p.trim());
    }
    if (!list.length) {
      // Dynamic photos (works online; OK for Vercel demo)
      list.push(buildUnsplashUrl(`university,${name}`));
      if (u.city) list.push(buildUnsplashUrl(`campus,${fixAccents(u.city)}`));
      list.push(buildUnsplashUrl("education,building"));
    }
    // Ensure at least 1
    if (!list.length) list.push(buildAvatarDataUrl(name));
    // Deduplicate
    return Array.from(new Set(list)).slice(0, 5);
  }, [u, name]);

  const [idx, setIdx] = useState(0);
  const [errored, setErrored] = useState<Record<number, boolean>>({});
  const hovering = useRef(false);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      if (hovering.current) return;
      setIdx((p) => (p + 1) % images.length);
    }, autoMs);
    return () => clearInterval(t);
  }, [images.length, autoMs]);

  const show = (next: number) => {
    if (!images.length) return;
    const n = ((next % images.length) + images.length) % images.length;
    setIdx(n);
  };

  // NOTE: react-window uses a fixed item height; to avoid cards being clipped,
  // keep media height predictable (instead of relying on aspect-ratio utilities).
  const ratio =
    aspect === "square"
      ? "aspect-square"
      : compact
        ? "h-36 sm:h-40 md:h-44"
        : "h-40 sm:h-44 md:h-48 lg:h-52";

  return (
    <div
      className={"relative w-full overflow-hidden rounded-2xl bg-slate-100 " + ratio}
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
    >
      {images.map((src, i) => {
        const isActive = i === idx;
        const fallback = buildAvatarDataUrl(name);
        const realSrc = errored[i] ? fallback : src;
        return (
          <img
            key={i}
            src={realSrc}
            alt={`Foto de ${name}`}
            className={
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-500 " +
              (isActive ? "opacity-100" : "opacity-0")
            }
            loading={i === 0 ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            onError={() => setErrored((p) => ({ ...p, [i]: true }))}
          />
        );
      })}

      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              show(idx - 1);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow-sm hover:bg-white"
            aria-label="Anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              show(idx + 1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow-sm hover:bg-white"
            aria-label="Siguiente"
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir a imagen ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  show(i);
                }}
                className={
                  "h-1.5 w-1.5 rounded-full transition-all " +
                  (i === idx ? "bg-white w-4" : "bg-white/60 hover:bg-white/80")
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
