export type AnalyticsEventName =
  | "page_view"
  | "search"
  | "open_institution"
  | "open_program"
  | "compare_open"
  | "favorite_toggle"
  | "lead_submit";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const SESSION_KEY = "imgo_session_id";
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
let gaLoaded = false;

function ensureGtagLoaded() {
  if (!GA_ID) return;
  if (typeof window === "undefined") return;
  if (gaLoaded) return;

  // Create dataLayer/gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: any[]) {
    window.dataLayer!.push(args);
  };

  const existing = document.querySelector('script[data-imgo-ga="1"]');
  if (!existing) {
    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    s1.setAttribute("data-imgo-ga", "1");
    document.head.appendChild(s1);
  }

  window.gtag("js", new Date());
  window.gtag("config", GA_ID, {
    anonymize_ip: true
  });
  gaLoaded = true;
}

export function initGoogleAnalytics() {
  try {
    ensureGtagLoaded();
  } catch {
    // ignore
  }
}

export function getSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export async function track(name: AnalyticsEventName, props: Record<string, any> = {}) {
  // 1) Google Analytics (optional)
  try {
    ensureGtagLoaded();
    if (GA_ID && typeof window !== "undefined" && typeof window.gtag === "function") {
      const sessionId = getSessionId();

      // Map internal events to GA4 events
      if (name === "page_view") {
        window.gtag("event", "page_view", {
          page_path: props.path,
          page_location: window.location.href,
          page_title: document.title,
          session_id: sessionId
        });
      } else if (name === "lead_submit") {
        window.gtag("event", "generate_lead", {
          session_id: sessionId,
          lead_topic: props.topic || props.programName || props.institutionName || undefined,
          lead_type: props.type || undefined
        });
      } else {
        window.gtag("event", name, {
          session_id: sessionId,
          ...props
        });
      }
    }
  } catch {
    // ignore
  }

  // 2) Local demo analytics (API)
  try {
    const sessionId = getSessionId();
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, name, props })
    });
  } catch {
    // ignore in demo
  }
}
