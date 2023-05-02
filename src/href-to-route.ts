import { getClientBuildManifest } from "next/dist/client/route-loader";
import { normalizeLocalePath } from "next/dist/shared/lib/i18n/normalize-locale-path";
import { PrefetchOptions } from "next/dist/shared/lib/router/router";
import { addLocale } from "next/dist/shared/lib/router/utils/add-locale";
import { formatWithValidation } from "next/dist/shared/lib/router/utils/format-url";
import { parseRelativeUrl } from "next/dist/shared/lib/router/utils/parse-relative-url";
import resolveRewrites from "next/dist/shared/lib/router/utils/resolve-rewrites";
import { SingletonRouter } from "next/router";
import { resolveDynamicRoute } from "./resolve-dynamic-route";
import {
  addBasePath,
  removeBasePath,
  removeLocale,
  removePathTrailingSlash,
} from "./utils";
import { ParsedUrlQuery } from "querystring";

type hrefToRouteReturn = {
  route: string;
  query: ParsedUrlQuery;
};
export const hrefToRoute = async ({
  url,
  asPath,
  options,
  singletonRouter,
}: {
  url: string;
  asPath: string;
  options: PrefetchOptions;
  singletonRouter: SingletonRouter;
}): Promise<hrefToRouteReturn> => {
  const router = singletonRouter.router!;

  let parsed = parseRelativeUrl(url);

  let { pathname, query } = parsed;

  if (process.env.__NEXT_I18N_SUPPORT) {
    if (options.locale === false) {
      pathname = normalizeLocalePath!(pathname, router.locales).pathname;
      parsed.pathname = pathname;
      url = formatWithValidation(parsed);

      let parsedAs = parseRelativeUrl(asPath);
      const localePathResult = normalizeLocalePath!(
        parsedAs.pathname,
        router.locales
      );
      parsedAs.pathname = localePathResult.pathname;
      options.locale = localePathResult.detectedLocale || router.defaultLocale;
      asPath = formatWithValidation(parsedAs);
    }
  }

  const pages = await router.pageLoader.getPageList();
  let resolvedAs = asPath;

  if (process.env.__NEXT_HAS_REWRITES && asPath.startsWith("/")) {
    let rewrites: any;
    ({ __rewrites: rewrites } = await getClientBuildManifest());

    const rewritesResult = resolveRewrites(
      addBasePath(addLocale(asPath, router.locale)) || "/",
      pages,
      rewrites,
      parsed.query,
      (p: string) => resolveDynamicRoute(p, pages),
      router.locales
    );
    resolvedAs = removeLocale(
      removeBasePath(rewritesResult.asPath),
      router.locale
    );

    if (rewritesResult.matchedPage && rewritesResult.resolvedHref) {
      pathname = rewritesResult.resolvedHref;
      parsed.pathname = pathname;
      url = formatWithValidation(parsed);
    }
  } else {
    parsed.pathname = resolveDynamicRoute(parsed.pathname, pages);

    if (parsed.pathname !== pathname) {
      pathname = parsed.pathname;
      parsed.pathname = pathname;
      url = formatWithValidation(parsed);
    }
  }

  const route = removePathTrailingSlash(pathname);

  return { route, query };
};
