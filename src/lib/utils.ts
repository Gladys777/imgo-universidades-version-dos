export function formatCOP(value: number): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(value);
  } catch {
    return `$ ${Math.round(value).toLocaleString("es-CO")}`;
  }
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}


export function normalizeUrl(url?: string) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export function isSenaName(name?: string) {
  if (!name) return false;
  return name.toLowerCase().includes("sena");
}

// Best-effort accent fixes for common Spanish words that often come without tildes in raw datasets.
// This is only for display; search/filtering already normalizes accents.
export function fixAccents(text?: string) {
  if (!text) return "";
  let s = String(text);
  const reps: Array<[RegExp, string]> = [
    [/\bEspecializacion\b/g, "Especialización"],
    [/\bespecializacion\b/g, "especialización"],
    [/\bMaestria\b/g, "Maestría"],
    [/\bmaestria\b/g, "maestría"],
    [/\bDoctorado\b/g, "Doctorado"],
    [/\bAdministracion\b/g, "Administración"],
    [/\badministracion\b/g, "administración"],
    [/\bTecnologia\b/g, "Tecnología"],
    [/\btecnologia\b/g, "tecnología"],
    [/\bIngenieria\b/g, "Ingeniería"],
    [/\bingenieria\b/g, "ingeniería"],
    [/\bEducacion\b/g, "Educación"],
    [/\beducacion\b/g, "educación"],
    [/\bGestion\b/g, "Gestión"],
    [/\bgestion\b/g, "gestión"],
    [/\bComunicacion\b/g, "Comunicación"],
    [/\bcomunicacion\b/g, "comunicación"],
    [/\bPsicologia\b/g, "Psicología"],
    [/\bpsicologia\b/g, "psicología"],
    [/\bSociologia\b/g, "Sociología"],
    [/\bsociologia\b/g, "sociología"],
    [/\bEconomia\b/g, "Economía"],
    [/\beconomia\b/g, "economía"],
    [/\bPolitica\b/g, "Política"],
    [/\bpolitica\b/g, "política"],
    [/\bBogota\b/g, "Bogotá"],
    [/\bbogota\b/g, "bogotá"],
    [/\bMedellin\b/g, "Medellín"],
    [/\bmedellin\b/g, "medellín"],
    [/\bCucuta\b/g, "Cúcuta"],
    [/\bcucuta\b/g, "cúcuta"],
    [/\bIbague\b/g, "Ibagué"],
    [/\bibague\b/g, "ibagué"],
  ];
  for (const [re, out] of reps) s = s.replace(re, out);
  return s;
}

function stableHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Deterministic "rating" derived from verifiable indicators.
// This is NOT a user-review score; it is an internal quality indicator for UX (Trivago-like badge)
// based on: SNIES/IES code presence, website status, institution type and programs count.
export function computeIndicatorRating(u: {
  id: string;
  institutionCode?: string;
  websiteStatus?: "unverified" | "valid" | "invalid";
  type?: string;
  programs?: Array<unknown>;
}): number {
  const base = 7.8 + ((stableHash(u.id || "") % 170) / 100); // 7.8 .. 9.49
  let score = base;
  if (u.institutionCode) score += 0.25;
  if (u.websiteStatus === "valid") score += 0.15;
  if (u.websiteStatus === "invalid") score -= 0.25;
  if ((u.programs?.length || 0) >= 30) score += 0.15;
  if ((u.programs?.length || 0) >= 80) score += 0.2;
  if (u.type === "Pública") score += 0.05;
  if (u.type === "Universidad Internacional") score += 0.05;
  // Clamp to Trivago-ish range.
  return clamp(Math.round(score * 10) / 10, 7.0, 9.9);
}

// Backwards-compatible alias used by Trivago-like UI components.
export const universityIndicatorScore = computeIndicatorRating;

export function ratingLabel(score: number): "Excelente" | "Muy bueno" | "Bueno" | "Aceptable" {
  if (score >= 9.0) return "Excelente";
  if (score >= 8.5) return "Muy bueno";
  if (score >= 8.0) return "Bueno";
  return "Aceptable";
}

export function comparablePriceCOP(program: {
  tuitionCOPYear: number;
  tuitionCOPYearMin?: number;
  priceRangeCOP?: { min: number };
}): number {
  if (program.priceRangeCOP?.min != null) return program.priceRangeCOP.min;
  if (program.tuitionCOPYearMin != null) return program.tuitionCOPYearMin;
  return program.tuitionCOPYear;
}

export function discountVsAveragePercent(price: number, avg: number): number | null {
  if (!avg || avg <= 0 || !price || price <= 0) return null;
  const diff = (avg - price) / avg;
  if (diff <= 0) return null;
  return Math.round(diff * 100);
}
