import React from "react";
import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import Badge from "./Badge";
import UniversityCarousel from "./UniversityCarousel";
import { ProgramHit } from "../lib/types";
import {
  comparablePriceCOP,
  discountVsAveragePercent,
  fixAccents,
  formatCOP,
  isSenaName,
  ratingLabel,
  universityIndicatorScore
} from "../lib/utils";

function priceBadge(program: ProgramHit["program"]) {
  const pr = program.priceRangeCOP;
  if (pr) {
    const label = pr.min === pr.max ? formatCOP(pr.min) : `${formatCOP(pr.min)}–${formatCOP(pr.max)}`;
    const suffix = pr.billing === "curso" ? " / curso" : pr.billing === "mes" ? " / mes" : " / año";
    return `${label}${suffix}`;
  }
  const min = program.tuitionCOPYearMin ?? Math.round(program.tuitionCOPYear * 0.9);
  const max = program.tuitionCOPYearMax ?? Math.round(program.tuitionCOPYear * 1.1);
  const label = min === max ? formatCOP(min) : `${formatCOP(min)}–${formatCOP(max)}`;
  const note = program.tuitionNote ? ` · ${program.tuitionNote}` : " · Estimado";
  return `${label} / año${note}`;
}

export default function ProgramCard({
  hit,
  selected,
  onToggleCompare,
  onOpenDetails,
  avgPrice
}: {
  hit: ProgramHit;
  selected: boolean;
  onToggleCompare: () => void;
  onOpenDetails: () => void;
  avgPrice?: number;
}) {
  const { university, program } = hit;
  // Reviews are not shown as demo; indicators are used instead.
  const score = universityIndicatorScore(university);
  const label = ratingLabel(score);
  const sena = isSenaName(university.name);
  const discount = !sena && avgPrice ? discountVsAveragePercent(comparablePriceCOP(program), avgPrice) : null;

return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
      {/* Media */}
      <div className="p-3 sm:p-4">
        <div className="relative">
          <UniversityCarousel u={university} />
          {/* Rating badge (indicator-based) */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <div className="rounded-lg bg-[#1b7f3a] text-white px-2 py-1 text-xs font-extrabold">
              {score.toFixed(1)}
            </div>
            <div className="rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-slate-900 ring-1 ring-slate-200">
              {label}
            </div>
          </div>

          {/* Discount badge */}
          {discount != null ? (
            <div className="absolute left-4 bottom-4">
              <span className="rounded-full bg-[#b8153a] text-white px-3 py-1 text-[11px] font-semibold">
                {discount}% menos que el promedio
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-semibold leading-tight line-clamp-2">
              {fixAccents(program.title)}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 line-clamp-1">
              {fixAccents(university.name)} · {fixAccents(university.city)}, {fixAccents(university.department)}
            </p>
          </div>

          <button
            onClick={onToggleCompare}
            className={
              "shrink-0 inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs " +
              (selected
                ? "border-[#044AA9] bg-[#044AA9] text-white hover:bg-[#033f93]"
                : "border-slate-200 hover:bg-slate-50")
            }
            type="button"
            title={selected ? "Quitar de comparación" : "Agregar a comparación"}
          >
            {selected ? (
              <>
                Quitar <X size={14} />
              </>
            ) : (
              <>
                Comparar <Plus size={14} />
              </>
            )}
          </button>
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge>{program.level}</Badge>
          <Badge>{program.modality}</Badge>
          <Badge>{program.area}</Badge>
          <Badge>{Math.round(program.durationMonths / 6)} sem</Badge>
          <Badge>{isSenaName(university.name) ? "Gratis" : priceBadge(program)}</Badge>
        </div>

        {/* Indicators + CTAs */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-600">
            {university.institutionCode ? (
              <span className="rounded-full bg-slate-100 px-2 py-1">SNIES/IES: {university.institutionCode}</span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-2 py-1">Programas: {university.programs.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/institucion/${university.id}`}
              className="inline-flex items-center rounded-xl border border-slate-200 px-2.5 py-2 text-xs hover:bg-slate-50"
              title="Ver ficha de la institución"
            >
              Ver institución
            </Link>

            <Link
              to={`/programa/${hit.id}`}
              className="inline-flex items-center rounded-xl bg-[#044AA9] px-2.5 py-2 text-xs text-white hover:bg-[#033f93]"
              title="Abrir ficha del programa"
            >
              Ver oferta
            </Link>

            <button
              onClick={onOpenDetails}
              className="hidden sm:inline-flex items-center rounded-xl border border-slate-200 px-2.5 py-2 text-xs hover:bg-slate-50"
              title="Ver detalles rápidos"
              type="button"
            >
              Detalles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
