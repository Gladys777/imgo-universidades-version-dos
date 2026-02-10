import React, { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ProgramHit } from "../lib/types";
import UniversityCarousel from "./UniversityCarousel";
import {
  comparablePriceCOP,
  discountVsAveragePercent,
  fixAccents,
  formatCOP,
  isSenaName,
  ratingLabel,
  universityIndicatorScore
} from "../lib/utils";

export default function ResultsCarousel({
  items,
  avgByKey,
  title = "Resultados"
}: {
  items: ProgramHit[];
  // Map key = `${area}|${level}|${modality}` => average price
  avgByKey: Map<string, number>;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const cards = useMemo(() => {
    return items.map((h) => {
      const u = h.university;
      const p = h.program;
      const score = universityIndicatorScore(u);
      const key = `${p.area}|${p.level}|${p.modality}`;
      const avg = avgByKey.get(key) || 0;
      const sena = isSenaName(u.name);
      const price = sena ? 0 : comparablePriceCOP(p);
      const discount = sena ? null : discountVsAveragePercent(price, avg);
      return { h, score, label: ratingLabel(score), discount };
    });
  }, [items, avgByKey]);

  function scrollBy(dx: number) {
    ref.current?.scrollBy({ left: dx, behavior: "smooth" });
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-600">Desliza para ver más</p>
      </div>

      <div className="mt-3 relative">
        <button
          type="button"
          onClick={() => scrollBy(-420)}
          className="hidden md:inline-flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          aria-label="Anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
        >
          {cards.map(({ h, score, label, discount }) => {
            const u = h.university;
            const sena = isSenaName(u.name);
            const priceText = sena ? "Gratis" : formatCOP(comparablePriceCOP(h.program));
            return (
              <div
                key={h.id}
                className="snap-start w-[260px] sm:w-[280px] md:w-[300px] flex-none rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden"
              >
                <div className="p-3">
                  <div className="relative">
                    <UniversityCarousel u={u} compact />
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <div className="rounded-lg bg-[#1b7f3a] text-white px-2 py-1 text-xs font-bold">
                        {score.toFixed(1)}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 bg-white/90 rounded-lg px-2 py-1 ring-1 ring-slate-200">
                        {label}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <p className="text-sm font-semibold text-slate-900 line-clamp-1">{fixAccents(u.name)}</p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-1">
                    {fixAccents(u.city)}, {fixAccents(u.country || "Colombia")}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    {discount != null ? (
                      <span className="rounded-full bg-[#b8153a] text-white px-3 py-1 text-[11px] font-semibold">
                        {discount}% menos que el promedio
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">&nbsp;</span>
                    )}
                    <span className="text-sm font-extrabold text-slate-900">{priceText}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      to={`/institucion/${u.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                    >
                      Ver
                    </Link>
                    <Link
                      to={`/programa/${h.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#044AA9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#033f93]"
                    >
                      Ver oferta
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(420)}
          className="hidden md:inline-flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          aria-label="Siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
