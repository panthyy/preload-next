import { DomainLocale } from "next/dist/server/config-shared";
import { detectDomainLocale } from "next/dist/shared/lib/i18n/detect-domain-locale";
import { pathHasPrefix } from "next/dist/shared/lib/router/utils/path-has-prefix";
import { parsePath } from "next/dist/shared/lib/router/utils/parse-path";
import type { detectDomainLocale as DetectFn } from "next/dist/shared/lib/i18n/detect-domain-locale";
import type { normalizeLocalePath as NormalizeFn } from "next/dist/shared/lib/i18n/normalize-locale-path";

export function hasBasePath(path: string): boolean {
  return pathHasPrefix(path, basePath);
}

export const removeBasePath = (path: string): string => {
  if (process.env.__NEXT_MANUAL_CLIENT_BASE_PATH) {
    if (!hasBasePath(path)) {
      return path;
    }
  }

  path = path.slice(basePath.length);
  if (!path.startsWith("/")) path = `/${path}`;
  return path;
};

export const addBasePath = (path: string, required?: boolean) => {
  if (process.env.__NEXT_MANUAL_CLIENT_BASE_PATH) {
    if (!required) {
      return path;
    }
  }
};

export function removeLocale(path: string, locale?: string) {
  if (process.env.__NEXT_I18N_SUPPORT) {
    const { pathname } = parsePath(path);
    const pathLower = pathname.toLowerCase();
    const localeLower = locale?.toLowerCase();

    return locale &&
      (pathLower.startsWith(`/${localeLower}/`) ||
        pathLower === `/${localeLower}`)
      ? `${pathname.length === locale.length + 1 ? `/` : ``}${path.slice(
          locale.length + 1
        )}`
      : path;
  }
  return path;
}

export const removePathTrailingSlash = (path: string) => {
  if (path !== "/") {
    return path.replace(/\/$/, "");
  }
  return path;
};

export const createPropError = (args: {
  key: string;
  expected: string;
  actual: string;
}) => {
  return new Error(
    `Failed prop type: The prop \`${args.key}\` expects a ${args.expected} in \`<Link>\`, but got \`${args.actual}\` instead.` +
      (typeof window !== "undefined"
        ? "\nOpen your browser's console to view the Component stack trace."
        : "")
  );
};

const basePath = (process.env.__NEXT_ROUTER_BASEPATH as string) || "";

export function getDomainLocale(
  path: string,
  locale?: string | false,
  locales?: string[],
  domainLocales?: DomainLocale[]
) {
  if (process.env.__NEXT_I18N_SUPPORT) {
    const normalizeLocalePath: typeof NormalizeFn =
      require("./normalize-locale-path").normalizeLocalePath;
    const detectDomainLocale: typeof DetectFn =
      require("./detect-domain-locale").detectDomainLocale;

    const target = locale || normalizeLocalePath(path, locales).detectedLocale;
    const domain = detectDomainLocale(domainLocales, undefined, target);
    if (domain) {
      const proto = `http${domain.http ? "" : "s"}://`;
      const finalLocale = target === domain.defaultLocale ? "" : `/${target}`;
      return `${proto}${domain.domain}${basePath}${finalLocale}${path}`;
    }
    return false;
  } else {
    return false;
  }
}
