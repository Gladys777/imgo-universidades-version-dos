import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { pageTitle, siteUrl } from "../lib/seo";
import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import FilterPanel, { Filters } from "../components/FilterPanel";
import Modal from "../components/Modal";
import { InstitutionCategory, ProgramHit, University } from "../lib/types";
import MiniSearch from "minisearch";
import { normalizeText } from "../lib/search";
import TopBar from "../components/TopBar";
import { track } from "../lib/analytics";
import { comparablePriceCOP, isSenaName } from "../lib/utils";
import ResultsCarousel from "../components/ResultsCarousel";

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const DEFAULT_FILTERS: Filters = {
  q: "",
  area: "",
  level: "",
  modality: "",
  category: "",
  city: "",
  country: "",
  cityQuery: "",
  countryQuery: "",
  type: "",
  minTuition: 0,
  maxTuition: 60_000_000,
  minDurationMonths: 0,
  maxDurationMonths: 120
};

export default function HomePage({
  universities,
  allHits,
  dataLoading,
  dataError,
  compareIds,
  setCompareIds
}: {
  universities: University[];
  allHits: ProgramHit[];
  dataLoading: boolean;
  dataError: string | null;
  compareIds: string[];
  setCompareIds: (next: string[] | ((prev: string[]) => string[])) => void;
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [details, setDetails] = useState<ProgramHit | null>(null);
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(1);

  const location = useLocation();

  // Allow deep-linking to a category from the top nav: /?cat=Internacional
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get("cat") || "";
    if (!cat) return;
    const allowed: InstitutionCategory[] = [
      "Nacional",
      "Internacional",
      "Plataformas Digitales",
      "Idiomas e Inmersión"
    ];
    const next = (allowed.includes(cat as InstitutionCategory) ? (cat as InstitutionCategory) : "") as
      | ""
      | InstitutionCategory;
    setFilters((prev) => ({ ...prev, category: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const debouncedQ = useDebounced(filters.q, 250);


const hitById = useMemo(() => {
  const m = new Map<string, ProgramHit>();
  for (const h of allHits) m.set(h.id, h);
  return m;
}, [allHits]);

const mini = useMemo(() => {
  // Index only when we have data. This runs once per load.
  const ms = new MiniSearch({
    fields: ["title", "uni", "city", "dept", "area", "level", "modality"],
    storeFields: ["id"],
    searchOptions: { prefix: true }
  });
  // Avoid indexing when empty
  if (allHits.length === 0) return ms;

  const docs = allHits.map((h) => ({
    id: h.id,
    title: h.program.title,
    uni: h.university.name,
    city: h.university.city,
    dept: h.university.department,
    area: h.program.area,
    level: h.program.level,
    modality: h.program.modality
  }));
  ms.addAll(docs);
  return ms;
}, [allHits]);

  const cities = useMemo(
    () =>
      Array.from(new Set(universities.map((u) => (u.city || "").trim())))
        .filter((c): c is string => Boolean(c))
        .sort(),
    [universities]
  );

  const countries = useMemo(
    () =>
      Array.from(new Set(universities.map((u) => (u.country || "").trim())))
        .filter((c): c is string => Boolean(c))
        .sort(),
    [universities]
  );

  const filtered = useMemo(() => {
  const q = normalizeText(debouncedQ);

  // Start set: if query exists, use index; otherwise use all hits.
  let base: ProgramHit[] = allHits;

  if (q) {
    const results = mini.search(q);
    const ids = results.slice(0, 4000).map((r: any) => r.id as string);
    base = ids.map((id) => hitById.get(id)).filter(Boolean) as ProgramHit[];
  }

  return base.filter((h) => {
    const { university: u, program: p } = h;
    const isSena = isSenaName(u.name);
    if (filters.category && (u.category || "") !== filters.category) return false;
    if (filters.area && p.area !== filters.area) return false;
    if (filters.level && p.level !== filters.level) return false;
    if (filters.modality && p.modality !== filters.modality) return false;
    if (filters.city && u.city !== filters.city) return false;
    if (filters.country && (u.country || "") !== filters.country) return false;
    if (filters.cityQuery) {
      const cq = normalizeText(filters.cityQuery);
      if (!normalizeText(u.city || "").includes(cq)) return false;
    }
    if (filters.countryQuery) {
      const k = normalizeText(filters.countryQuery);
      if (!normalizeText(u.country || "").includes(k)) return false;
    }
    if (filters.type && u.type !== filters.type) return false;
    // Use min/max ranges (budget + duration)
    // SENA should always show as "Gratis" and must not be excluded by budget filters.
    if (!isSena) {
      if (filters.minTuition && p.tuitionCOPYear < filters.minTuition) return false;
      if (filters.maxTuition && p.tuitionCOPYear > filters.maxTuition) return false;
    }
    if (filters.minDurationMonths && p.durationMonths < filters.minDurationMonths) return false;
    if (filters.maxDurationMonths && p.durationMonths > filters.maxDurationMonths) return false;

    if (!q) return true;
    // If we used the index above, most non-matches are already excluded.
    // Keep a cheap guard for edge cases.
    const hay = normalizeText(`${p.title} ${u.name} ${u.city} ${u.department}`);
    return hay.includes(q);
  });
}, [allHits, debouncedQ, filters, hitById, mini]);

  // Average price benchmarks by segment to compute "X% menos" badges (indicator-based, not a promise).
  const avgByKey = useMemo(() => {
    const buckets = new Map<string, number[]>();
    for (const h of allHits) {
      const u = h.university;
      const p = h.program;
      if (isSenaName(u.name)) continue;
      const price = comparablePriceCOP(p);
      if (!price || price <= 0) continue;
      const key = `${p.area}|${p.level}|${p.modality}`;
      const arr = buckets.get(key) || [];
      arr.push(price);
      buckets.set(key, arr);
    }
    const out = new Map<string, number>();
    for (const [k, arr] of buckets.entries()) {
      arr.sort((a, b) => a - b);
      // trimmed mean: drop extremes (10%) to reduce outliers
      const cut = Math.floor(arr.length * 0.1);
      const trimmed = arr.slice(cut, Math.max(cut + 1, arr.length - cut));
      const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
      out.set(k, avg);
    }
    return out;
  }, [allHits]);

  // University-first experience (Trivago-like): we render institutions in horizontal rows.

  // Top 100 universities by program volume (proxy for "más buscadas" while we add real search telemetry).
  // We render one representative program per university so the card can keep the "Ver oferta" CTA.
  const top100UniversityHits = useMemo(() => {
    if (allHits.length === 0 || universities.length === 0) return [] as ProgramHit[];

    // Representative hit per university: choose the cheapest comparable program (or the first available).
    const bestHitByUni = new Map<string, ProgramHit>();
    const bestPriceByUni = new Map<string, number>();
    for (const h of allHits) {
      const uniId = h.university.id;
      const sena = isSenaName(h.university.name);
      const price = sena ? 0 : comparablePriceCOP(h.program);
      const prev = bestPriceByUni.get(uniId);
      if (prev == null) {
        bestHitByUni.set(uniId, h);
        bestPriceByUni.set(uniId, price || 0);
      } else {
        // Prefer lower positive prices; treat 0 as unknown unless SENA.
        const next = price || prev;
        if ((next > 0 && next < prev) || (prev === 0 && next > 0)) {
          bestHitByUni.set(uniId, h);
          bestPriceByUni.set(uniId, next);
        }
      }
    }

    // Count programs per university (volume).
    const counts = new Map<string, number>();
    for (const h of allHits) {
      counts.set(h.university.id, (counts.get(h.university.id) || 0) + 1);
    }

    const sortedUniIds = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([id]) => id);

    return sortedUniIds
      .map((id) => bestHitByUni.get(id))
      .filter(Boolean) as ProgramHit[];
  }, [allHits, universities]);

  // Universities matching current filters (unique institutions), ordered by program volume.
  const filteredUniversityHits = useMemo(() => {
    if (filtered.length === 0) return [] as ProgramHit[];

    // Count total programs per university across the full dataset (stable popularity proxy).
    const totalCounts = new Map<string, number>();
    for (const h of allHits) {
      totalCounts.set(h.university.id, (totalCounts.get(h.university.id) || 0) + 1);
    }

    // Pick one representative hit per university from the filtered set.
    const bestHitByUni = new Map<string, ProgramHit>();
    const bestPriceByUni = new Map<string, number>();
    for (const h of filtered) {
      const uniId = h.university.id;
      const sena = isSenaName(h.university.name);
      const price = sena ? 0 : comparablePriceCOP(h.program);
      const prev = bestPriceByUni.get(uniId);
      if (prev == null) {
        bestHitByUni.set(uniId, h);
        bestPriceByUni.set(uniId, price || 0);
      } else {
        const next = price || prev;
        if ((next > 0 && next < prev) || (prev === 0 && next > 0)) {
          bestHitByUni.set(uniId, h);
          bestPriceByUni.set(uniId, next);
        }
      }
    }

    const uniIds = Array.from(bestHitByUni.keys()).sort((a, b) => {
      return (totalCounts.get(b) || 0) - (totalCounts.get(a) || 0);
    });
    return uniIds.map((id) => bestHitByUni.get(id)).filter(Boolean) as ProgramHit[];
  }, [allHits, filtered]);

  const top10UniversityHits = useMemo(() => filteredUniversityHits.slice(0, 10), [filteredUniversityHits]);
  const restUniversityHits = useMemo(() => filteredUniversityHits.slice(10), [filteredUniversityHits]);

  const universityRows = useMemo(() => {
    const rows: ProgramHit[][] = [];
    for (let i = 0; i < restUniversityHits.length; i += 10) {
      rows.push(restUniversityHits.slice(i, i + 10));
    }
    return rows;
  }, [restUniversityHits]);

  const totalProgramsAll = allHits.length;

  useEffect(() => {
    const q = debouncedQ.trim();
    if (!q) return;
    track("search", {
      q,
      results: filtered.length,
      category: filters.category || undefined,
      city: filters.city || undefined
    });
  }, [debouncedQ, filtered.length, filters.category, filters.city]);

  useEffect(() => {
    setPage(1);
  }, [filters, debouncedQ]);

const totalPages = useMemo(() => {
  return Math.max(1, Math.ceil(filtered.length / pageSize));
}, [filtered.length, pageSize]);

const currentPage = useMemo(() => {
  return Math.min(Math.max(1, page), totalPages);
}, [page, totalPages]);

const pageItems = useMemo(() => {
  const start = (currentPage - 1) * pageSize;
  return filtered.slice(start, start + pageSize);
}, [filtered, currentPage, pageSize]);

const pageNumbers = useMemo(() => {
  const maxButtons = 7;
  if (totalPages <= maxButtons) return Array.from({ length: totalPages }, (_, i) => i + 1);
  let start = Math.max(1, currentPage - 3);
  let end = Math.min(totalPages, start + (maxButtons - 1));
  start = Math.max(1, end - (maxButtons - 1));
  const nums: number[] = [];
  for (let n = start; n <= end; n++) nums.push(n);
  return nums;
}, [currentPage, totalPages]);




  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const exists = list.includes(id);
      if (exists) return list.filter((x) => x !== id);
      if (list.length >= 4) return list; // límite
      return [...list, id];
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
  <Helmet>
    <title>{pageTitle()}</title>
    <meta
      name="description"
      content="Metabúsqueda y comparación de programas y universidades en Colombia. Filtra por modalidad, nivel, ciudad y más."
    />
    <link rel="canonical" href={`${siteUrl()}/`} />
    <meta property="og:title" content={pageTitle()} />
    <meta
      property="og:description"
      content="Compara programas e instituciones educativas en Colombia con filtros avanzados."
    />
    <meta property="og:type" content="website" />
  </Helmet>

      <TopBar activeCategory={filters.category || ""} />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
        {/* Hero */}
        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-6 py-10 text-center">
          <img
            src="/assets/imgo_logo.png"
            alt="ImGo"
            className="mx-auto h-14 w-auto"
            loading="eager"
            decoding="async"
          />
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Encuentra tu carrera ideal
          </h1>
<div id="search" className="mt-8 flex flex-col sm:flex-row items-stretch justify-center gap-3">
            <div className="w-full sm:w-[560px] rounded-2xl border border-[#f1c08a] bg-white px-4 py-3 flex items-center gap-3">
              <Search size={20} className="text-[#044AA9]" />
              <input
                value={filters.q}
                onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
                placeholder="¿Qué te gustaría estudiar?"
                className="w-full outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                // No-op: search is live; keep for UX parity with the mock.
                const el = document.getElementById("search");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="rounded-2xl bg-[#ff8a1f] px-10 py-3 font-semibold text-white shadow-sm hover:brightness-95"
            >
              Buscar
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {(["", "Internacional", "Plataformas Digitales", "Idiomas e Inmersión"] as const).map((cat) => {
              const label = cat ? cat : `Todos (${universities.length})`;
              const active = (filters.category || "") === cat;

              const base = "rounded-2xl px-4 py-2 text-sm font-semibold ring-1 transition";
              const activeCls = "ring-slate-200";
              const inactiveCls = "ring-slate-200 hover:brightness-95";

              const palette = (c: string) => {
                if (!c) return { bg: "bg-slate-100", text: "text-slate-900" };
                if (c === "Internacional") return { bg: "bg-[#bfe2ff]", text: "text-[#044AA9]" };
                if (c === "Plataformas Digitales") return { bg: "bg-[#ffb24a]", text: "text-white" };
                return { bg: "bg-[#d8f2d8]", text: "text-[#1b6b3a]" };
              };
              const p = palette(cat);
              const cls =
                base +
                " " +
                p.bg +
                " " +
                p.text +
                " " +
                (active ? activeCls : inactiveCls);
              return (
                <button
                  key={cat || "all"}
                  type="button"
                  className={cls}
                  onClick={() => setFilters((p) => ({ ...p, category: cat }))}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Big counters for investment/demo */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
              <p className="text-xs font-semibold text-slate-600">Programas disponibles</p>
              <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">{totalProgramsAll.toLocaleString("es-CO")}</p>
              <p className="mt-1 text-xs text-slate-500">Incluye Colombia + categorías internacionales cargadas</p>
            </div>
            <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
              <p className="text-xs font-semibold text-slate-600">Instituciones</p>
              <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">{universities.length.toLocaleString("es-CO")}</p>
              <p className="mt-1 text-xs text-slate-500">Nacional, internacional y plataformas</p>
            </div>
            <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
              <p className="text-xs font-semibold text-slate-600">Países / Ciudades</p>
              <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
                {countries.length.toLocaleString("es-CO")} / {cities.length.toLocaleString("es-CO")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Cobertura (según dataset)</p>
            </div>
          </div>
        </section>

        {/* Destacadas (Top 10) */}
        {!dataLoading && !dataError && top10UniversityHits.length > 0 ? (
          <section className="mt-10">
            <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-5">
              <ResultsCarousel items={top10UniversityHits} avgByKey={avgByKey} title="Destacadas (Top 10)" />
              <p className="mt-2 text-xs text-slate-500">
                Para ver fotos reales, ejecuta <span className="font-semibold">npm run data:photos</span> (usa Wikimedia/Wikipedia). Si una institución no tiene fotos aún, se muestra un placeholder neutro.
              </p>
            </div>
          </section>
        ) : null}

        {/* Todas las instituciones en carruseles horizontales (de a 10), el resto hacia abajo */}
        {!dataLoading && !dataError && universityRows.length > 0 ? (
          <section className="mt-8">
            {universityRows.map((row, idx) => {
              const start = 10 + idx * 10 + 1;
              const end = 10 + idx * 10 + row.length;
              return (
                <div key={idx} className="mt-6 rounded-3xl bg-white ring-1 ring-slate-200 p-5">
                  <ResultsCarousel items={row} avgByKey={avgByKey} title={`Instituciones ${start}–${end}`} />
                </div>
              );
            })}
          </section>
        ) : null}

        {/* Program list */}
        <section id="resultados" className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-3xl font-extrabold text-slate-900">Programas de estudios</h2>
            <Link
              to="/comparar"
              className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Comparar ({compareIds.length}/4)
            </Link>
          </div>

          <div className="mt-5 rounded-3xl bg-white ring-1 ring-slate-200 p-4">
            {/* Inline filters like the mock */}
            <FilterPanel filters={filters} setFilters={setFilters} cities={cities} countries={countries} compact />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Resultados: <span className="font-semibold text-slate-900">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600">Registros</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs"
                >
                  {[25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {dataLoading && (
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 text-sm">
                Cargando instituciones y programas…
              </div>
            )}

            {dataError && (
              <div className="rounded-2xl bg-red-50 ring-1 ring-red-200 p-4 text-sm">
                Error cargando datos: <span className="font-semibold">{dataError}</span>
              </div>
            )}

            {!dataLoading && !dataError && filtered.length === 0 && (
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-6">
                <p className="text-sm font-semibold">Sin resultados</p>
                <p className="mt-1 text-sm text-slate-600">Ajusta filtros o prueba otra búsqueda.</p>
              </div>
            )}

            {!dataLoading && !dataError && pageItems.length > 0 && (
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4">
                <ResultsCarousel items={pageItems} avgByKey={avgByKey} title="Programas de estudios" />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
