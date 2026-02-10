import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { initGoogleAnalytics } from "./lib/analytics";
import "./styles.css";

// Optional: enable GA4 if VITE_GA_MEASUREMENT_ID is set
initGoogleAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider><BrowserRouter><App /></BrowserRouter></HelmetProvider>
  </React.StrictMode>
);
