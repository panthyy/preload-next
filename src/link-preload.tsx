/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-floating-promises */

import { UrlObject } from "url";
import { resolveHref } from "next/dist/shared/lib/router/utils/resolve-href";
import { addLocale } from "next/dist/shared/lib/router/utils/add-locale";
import { isLocalURL } from "next/dist/shared/lib/router/utils/is-local-url";
import { useRouter } from "next/router";
import { useIntersection } from "next/dist/client/use-intersection";
import singletonRouter from "next/router";
import React, { HTMLAttributes } from "react";
import { addBasePath, getDomainLocale } from "./utils";
import { useContext } from "react";
import { linkClicked } from "./link-clicked";
import { prefetch } from "./prefetch";
import { PreloadContext } from "./context";

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
} & Omit<HTMLAttributes<HTMLAnchorElement>, "href" | "as" | "passHref">;

const prefetched: { [cacheKey: string]: boolean } = {};

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

  const preloadContext = useContext(PreloadContext);
  React.useEffect(() => {
    const shouldPrefetch = isVisible && p && isLocalURL(href);
    const curLocale =
      typeof locale !== "undefined" ? locale : router && router.locale;
    const isPrefetched =
      prefetched[href + "%" + as + (curLocale ? "%" + curLocale : "")];
    if (shouldPrefetch && !isPrefetched) {
      prefetch(router, href, as, preloadContext, singletonRouter, prefetched, {
        locale: curLocale,
      });
    }
  }, [as, href, isVisible, locale, p, router]);

  const childProps: {
    onMouseEnter?: React.MouseEventHandler;
    onClick: React.MouseEventHandler;
    className?: string;
    href?: Url;
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
    href: props.href,
  };

  childProps.onMouseEnter = (e: React.MouseEvent) => {
    if (child.props && typeof child.props.onMouseEnter === "function") {
      child.props.onMouseEnter(e);
    }
    if (isLocalURL(href)) {
      prefetch(router, href, as, preloadContext, singletonRouter, {
        priority: true,
      });
    }
  };

  console.log(
    props.passHref || (child.type === "a" && !("href" in child.props))
  );
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

    childProps.className = props.className;

    childProps.href =
      localeDomain || addLocale(as, curLocale, router && router.defaultLocale);
  }

  return React.cloneElement(child, childProps);
};
