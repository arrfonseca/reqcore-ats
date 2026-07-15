// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import { readEnvFlagOverrides } from "./shared/feature-flags";

const railwayEnvironmentName =
  process.env.RAILWAY_ENVIRONMENT_NAME?.toLowerCase() ?? "";
const railwayPublicDomain =
  process.env.RAILWAY_PUBLIC_DOMAIN?.toLowerCase() ?? "";
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || "https://reqcore.com";
const i18nDefaultLocale = "pt-BR";
const i18nLocales = [
  {
    code: "pt-BR",
    language: "pt-BR",
    name: "Português (Brasil)",
    file: "pt-BR.json",
    partial: true,
  },
];

const localizedPublicRouteRules = Object.fromEntries(
  i18nLocales
    .filter((locale) => locale.code !== i18nDefaultLocale)
    .flatMap((locale) => [
      [`/${locale.code}/jobs`, { isr: 3600 }],
      [`/${locale.code}/jobs/**`, { isr: 3600 }],
      [`/${locale.code}/:orgSlug`, { isr: 3600 }],
      [`/${locale.code}/:orgSlug/**`, { isr: 3600 }],
    ]),
);

// Allow search-engine indexing for localized job board pages
const localizedJobsRobotsRules = Object.fromEntries(
  i18nLocales
    .filter((locale) => locale.code !== i18nDefaultLocale)
    .flatMap((locale) => [
      [
        `/${locale.code}/jobs`,
        { headers: { "X-Robots-Tag": "index, follow" } },
      ],
      [
        `/${locale.code}/jobs/**`,
        { headers: { "X-Robots-Tag": "index, follow" } },
      ],
      [
        `/${locale.code}/:orgSlug`,
        { headers: { "X-Robots-Tag": "index, follow" } },
      ],
      [
        `/${locale.code}/:orgSlug/**`,
        { headers: { "X-Robots-Tag": "index, follow" } },
      ],
    ]),
);

const isRailwayPreview =
  railwayEnvironmentName.startsWith("pr") ||
  railwayEnvironmentName.includes("pr-") ||
  railwayEnvironmentName.includes("pull request") ||
  railwayEnvironmentName.includes("pull-request") ||
  railwayEnvironmentName.includes("preview") ||
  railwayPublicDomain.includes("-pr-");

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@nuxtjs/i18n",
    "@nuxtjs/mdc",
  ],

  css: ["~/assets/css/main.css"],

  sourcemap: { client: "hidden" },

  i18n: {
    baseUrl: siteUrl,
    defaultLocale: i18nDefaultLocale,
    strategy: "prefix_except_default",
    locales: i18nLocales,
    langDir: "locales",
    detectBrowserLanguage: false,
    vueI18n: "./i18n.config.ts",
  },

  // ─────────────────────────────────────────────
  // Global <head> — lang, title template, favicon
  // ─────────────────────────────────────────────
  app: {
    head: {
      titleTemplate: "%s — Recursos Humanos",
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
      ],
      meta: [
        { name: "theme-color", content: "#ffffff" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0, maximum-scale=5.0",
        },
      ],
      // Dark-mode init script is injected in app/app.vue via useHead() with
      // the per-request nonce so it is allowed by the nonce-based CSP.
      // Plausible removed — PostHog handles all analytics
    },
  },

  runtimeConfig: {
    public: {
      /** Base URL of the marketing site (reqcore-web) for cross-domain links */
      marketingUrl:
        process.env.NUXT_PUBLIC_MARKETING_URL || "https://reqcore.com",
      /** Cookie domain for cross-subdomain sharing (e.g. '.reqcore.com') */
      cookieDomain: process.env.NUXT_PUBLIC_COOKIE_DOMAIN || "",
      /** When set, the dashboard shows a read-only demo banner for this org slug */
      demoOrgSlug: process.env.DEMO_ORG_SLUG || "",
      /** Public live-demo account email used to prefill sign-in */
      liveDemoEmail: (() => {
        const email =
          process.env.LIVE_DEMO_EMAIL ||
          process.env.DEMO_EMAIL ||
          "demo@reqcore.com";
        // Guard against stale applirank.com domain from old env vars
        if (email.endsWith("@applirank.com")) {
          console.warn(
            "[config] Stale demo email detected (applirank.com domain) — falling back to demo@reqcore.com",
          );
          return "demo@reqcore.com";
        }
        return email;
      })(),
      /** Public live-demo passcode used to prefill sign-in */
      liveDemoPasscode:
        process.env.LIVE_DEMO_SECRET || process.env.DEMO_PASSWORD || "demo1234",
      /** Whether OIDC SSO is enabled (all three OIDC env vars are set) */
      oidcEnabled: !!(
        process.env.OIDC_CLIENT_ID &&
        process.env.OIDC_CLIENT_SECRET &&
        process.env.OIDC_DISCOVERY_URL
      ),
      /** Display name for the SSO provider button */
      oidcProviderName: process.env.OIDC_PROVIDER_NAME || "SSO",
      /**
       * Feature flag overrides forced by env vars (FEATURE_FLAG_*).
       * Self-hosters use these to enable/disable flags without running PostHog.
       * See `shared/feature-flags.ts` for the full registry and resolution order.
       */
      // Cast: Nuxt narrows public runtime config from the registry's literal
      // `defaultValue` types (boolean here), but env overrides can also be
      // multivariate strings — and entries are partial. The override map is
      // validated at runtime by `parseFlagOverride`, so the cast is safe.
      featureFlagOverrides: readEnvFlagOverrides() as Record<
        string,
        boolean | string
      >,
      /** Platform hostname for tenant routing (e.g. reqcore.com) */
      platformHost:
        process.env.NUXT_PUBLIC_PLATFORM_HOST
        || (process.env.NUXT_PUBLIC_SITE_URL
          ? new URL(process.env.NUXT_PUBLIC_SITE_URL).host
          : 'reqcore.com'),
      /** CNAME target for custom domain DNS verification */
      customDomainCnameTarget:
        process.env.NUXT_PUBLIC_CUSTOM_DOMAIN_CNAME_TARGET || 'custom.reqcore.com',
      /** Public site URL for canonical links */
      siteUrl,
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  // ─────────────────────────────────────────────
  // Route rules — ISR for public job pages
  // ─────────────────────────────────────────────
  routeRules: {
    "/jobs": { isr: 3600 },
    "/jobs/**": { isr: 3600 },
    "/:orgSlug": { isr: 3600 },
    "/:orgSlug/**": { isr: 3600 },
    ...localizedPublicRouteRules,
  },

  nitro: {
    routeRules: {
      "/**": {
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
          "Strict-Transport-Security":
            "max-age=63072000; includeSubDomains; preload",
          // Content-Security-Policy is set dynamically with a per-request
          // nonce in server/middleware/csp.ts — do NOT add a static CSP here
          // as it would override the nonce and break the XSS protection.
          // Block indexing for all non-public routes by default;
          // overridden below for /jobs/** which should be indexable.
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
      // Public job board pages — allow indexing
      "/jobs/**": {
        headers: {
          "X-Robots-Tag": "index, follow",
        },
      },
      "/jobs": {
        headers: {
          "X-Robots-Tag": "index, follow",
        },
      },
      "/:orgSlug": {
        headers: {
          "X-Robots-Tag": "index, follow",
        },
      },
      "/:orgSlug/**": {
        headers: {
          "X-Robots-Tag": "index, follow",
        },
      },
      // Localized job board pages — allow indexing
      ...localizedJobsRobotsRules,
      // Allow same-origin framing for inline PDF preview in the sidebar iframe
      "/api/documents/*/preview": {
        headers: {
          "X-Frame-Options": "SAMEORIGIN",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'",
        },
      },
    },
  },
});
