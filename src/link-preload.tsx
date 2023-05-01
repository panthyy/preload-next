/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-floating-promises */

import { UrlObject } from "url";
import {
  NextRouter,
  PrefetchOptions,
} from "next/dist/shared/lib/router/router";
import { resolveHref } from "next/dist/shared/lib/router/utils/resolve-href";
import { addLocale } from "next/dist/shared/lib/router/utils/add-locale";
import { isLocalURL } from "next/dist/shared/lib/router/utils/is-local-url";
import { useRouter } from "next/router";
import { useIntersection } from "next/dist/client/use-intersection";
import singletonRouter from "next/router";
import { parseRelativeUrl } from "next/dist/shared/lib/router/utils/parse-relative-url";
import { formatWithValidation } from "next/dist/shared/lib/router/utils/format-url";
import { denormalizePagePath } from "next/dist/shared/lib/page-path/denormalize-page-path";
import { getClientBuildManifest } from "next/dist/client/route-loader";
import resolveRewrites from "next/dist/shared/lib/router/utils/resolve-rewrites";
import { isDynamicRoute } from "next/dist/shared/lib/router/utils";
import { ParsedUrlQuery } from "querystring";
import { QueryClient, useQueryClient } from "react-query";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { getRouteRegex } from "next/dist/shared/lib/router/utils/route-regex";
import { parsePath } from "next/dist/shared/lib/router/utils/parse-path";
import React, { useMemo } from "react";
import { DomainLocale } from "next/dist/server/config-shared";
import { normalizeLocalePath } from "next/dist/shared/lib/i18n/normalize-locale-path";
import { detectDomainLocale } from "next/dist/shared/lib/i18n/detect-domain-locale";
import {
  addBasePath,
  createPropError,
  getDomainLocale,
  removeBasePath,
  removeLocale,
  removePathTrailingSlash,
} from "./utils";
import Link from "next/link";

type Url = string | UrlObject;
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type LinkPreloadProps = {
  href: Url;
  as?: Url;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  prefetch?: boolean;
  locale?: string | false;
};
type LinkPropsRequired = RequiredKeys<LinkPreloadProps>;
type LinkPropsOptional = OptionalKeys<LinkPreloadProps>;

const prefetched: { [cacheKey: string]: boolean } = {};

export type PreloadContext = {
  session: Session | null;
  queryClient: QueryClient;
  query: ParsedUrlQuery;
};

export type WithPreload<Page> = Page & {
  preload: (context: PreloadContext) => Promise<void>;
};

function resolveDynamicRoute(pathname: string, pages: string[]) {
  const cleanPathname = removePathTrailingSlash(denormalizePagePath(pathname!));

  if (cleanPathname === "/404" || cleanPathname === "/_error") {
    return pathname;
  }

  if (!pages.includes(cleanPathname!)) {
    // eslint-disable-next-line array-callback-return
    pages.some((page) => {
      if (isDynamicRoute(page) && getRouteRegex(page).re.test(cleanPathname!)) {
        pathname = page;
        return true;
      }
    });
  }
  return removePathTrailingSlash(pathname);
}

type hrefToRouteReturn = {
  route: string;
  query: ParsedUrlQuery;
};

async function hrefToRoute({
  url,
  asPath,
  options,
}: {
  url: string;
  asPath: string;
  options: PrefetchOptions;
}): Promise<hrefToRouteReturn> {
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
}

function prefetch(
  router: NextRouter,
  href: string,
  as: string,
  extra: {
    queryClient: QueryClient;
    session: Session | null;
  },
  options: PrefetchOptions = {}
): void {
  if (typeof window === "undefined" || !router) return;
  if (!isLocalURL(href)) return;

  router
    .prefetch(href, as, options)
    .then(async () => {
      if (singletonRouter.router) {
        const { route, query } = await hrefToRoute({
          url: href,
          asPath: as,
          options,
        });
        const loaded = (await singletonRouter.router.pageLoader.loadPage(
          route
        )) as any;

        if (loaded.page.preload && typeof loaded.page.preload === "function") {
          const context: PreloadContext = {
            session: extra.session,
            queryClient: extra.queryClient,
            query,
          };
          await loaded.page.preload(context);
        } else {
          console.error(`LinkPreload: preload() not found for ${href}`);
        }
      }
    })
    .catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        throw err;
      }
    });

  const curLocale =
    options && typeof options.locale !== "undefined"
      ? options.locale
      : router && router.locale;

  prefetched[href + "%" + as + (curLocale ? "%" + curLocale : "")] = true;
}

function isModifiedEvent(event: React.MouseEvent): boolean {
  const { target } = event.currentTarget as HTMLAnchorElement;
  return (
    (target && target !== "_self") ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    (event.nativeEvent && event.nativeEvent.which === 2)
  );
}

function linkClicked(
  e: React.MouseEvent,
  router: NextRouter,
  href: string,
  as: string,
  replace?: boolean,
  shallow?: boolean,
  scroll?: boolean,
  locale?: string | false
): void {
  const { nodeName } = e.currentTarget;

  if (nodeName === "A" && (isModifiedEvent(e) || !isLocalURL(href))) {
    return;
  }

  e.preventDefault();

  if (scroll == null && as.indexOf("#") >= 0) {
    scroll = false;
  }

  router[replace ? "replace" : "push"](href, as, {
    shallow,
    locale,
    scroll,
  });
}

export const LinkPreload = (
  props: React.PropsWithChildren<LinkPreloadProps>
) => {
  const p = props.prefetch !== false;
  const router = useRouter();

  const { href, as } = React.useMemo(() => {
    const [resolvedHref, resolvedAs] = resolveHref(router, props.href, true);
    return {
      href: resolvedHref,
      as: props.as ? resolveHref(router, props.as) : resolvedAs || resolvedHref,
    };
  }, [router, props.href, props.as]);

  let { children, replace, shallow, scroll, locale } = props;

  if (typeof children === "string") {
    children = <a>{children}</a>;
  }

  let child: any;
  if (process.env.NODE_ENV === "development") {
    try {
      child = React.Children.only(children);
    } catch (err) {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Multiple children were passed to <Link> with \`href\` of \`${props.href}\` but only one child is supported https://nextjs.org/docs/messages/link-multiple-children` +
          (typeof window !== "undefined"
            ? " \nOpen your browser's console to view the Component stack trace."
            : "")
      );
    }
  } else {
    child = React.Children.only(children);
  }
  const childRef: any = child && typeof child === "object" && child.ref;

  const [setIntersectionRef, isVisible] = useIntersection({
    rootMargin: "200px",
  });
  const setRef = React.useCallback(
    (el: Element) => {
      setIntersectionRef(el);
      if (childRef) {
        if (typeof childRef === "function") childRef(el);
        else if (typeof childRef === "object") {
          childRef.current = el;
        }
      }
    },
    [childRef, setIntersectionRef]
  );

  const queryClient = useQueryClient();
  const session = useSession().data;
  React.useEffect(() => {
    const shouldPrefetch = isVisible && p && isLocalURL(href);
    const curLocale =
      typeof locale !== "undefined" ? locale : router && router.locale;
    const isPrefetched =
      prefetched[href + "%" + as + (curLocale ? "%" + curLocale : "")];
    if (shouldPrefetch && !isPrefetched) {
      prefetch(
        router,
        href,
        as,
        { queryClient, session },
        {
          locale: curLocale,
        }
      );
    }
  }, [as, href, isVisible, locale, p, router, queryClient, session]);

  const childProps: {
    onMouseEnter?: React.MouseEventHandler;
    onClick: React.MouseEventHandler;
    href?: string;
    ref?: any;
  } = {
    ref: setRef,
    onClick: (e: React.MouseEvent) => {
      if (child.props && typeof child.props.onClick === "function") {
        child.props.onClick(e);
      }
      if (!e.defaultPrevented) {
        linkClicked(e, router, href, as, replace, shallow, scroll, locale);
      }
    },
  };

  childProps.onMouseEnter = (e: React.MouseEvent) => {
    if (child.props && typeof child.props.onMouseEnter === "function") {
      child.props.onMouseEnter(e);
    }
    if (isLocalURL(href)) {
      prefetch(router, href, as, { queryClient, session }, { priority: true });
    }
  };

  if (props.passHref || (child.type === "a" && !("href" in child.props))) {
    const curLocale =
      typeof locale !== "undefined" ? locale : router && router.locale;

    const localeDomain =
      router &&
      router.isLocaleDomain &&
      getDomainLocale(
        as,
        curLocale,
        router && router.locales,
        router && router.domainLocales
      );

    childProps.href =
      localeDomain ||
      addBasePath(addLocale(as, curLocale, router && router.defaultLocale));
  }

  return React.cloneElement(child, childProps);
};
