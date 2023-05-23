import { GoodPageCache } from "next/dist/client/page-loader";
import { PrefetchOptions } from "next/dist/shared/lib/router/router";
import { isLocalURL } from "next/dist/shared/lib/router/utils/is-local-url";
import { NextRouter, SingletonRouter } from "next/router";
import { ComponentType } from "react";
import { hrefToRoute } from "./href-to-route";

export const prefetch = async (
  router: NextRouter,
  href: string,
  as: string,
  extra: any,
  singletonRouter: SingletonRouter,
  prefetched: { [cacheKey: string]: boolean },
  options: PrefetchOptions = {}
): Promise<void> => {
  if (typeof window === "undefined" || !router) return;
  if (!isLocalURL(href)) return;

  if (singletonRouter.router) {
    const { route, query } = await hrefToRoute({
      url: href,
      asPath: as,
      options,
      singletonRouter,
    });
    const loaded = (await singletonRouter.router.pageLoader.loadPage(
      route
    )) as GoodPageCache & {
      page: {
        preload?: (context: any) => Promise<any>;
      } & ComponentType;
    };

    if (loaded.page.preload && typeof loaded.page.preload === "function") {
      const context = {
        ...extra,
        query,
        route,
      };
      await loaded.page.preload(context);
    } else {
      console.error(`LinkPreload: preload() not found for ${href}`);
    }
  }

  const curLocale =
    options && typeof options.locale !== "undefined"
      ? options.locale
      : router && router.locale;

  prefetched[href + "%" + as + (curLocale ? "%" + curLocale : "")] = true;
};
