import { denormalizePagePath } from "next/dist/shared/lib/page-path/denormalize-page-path";
import { isDynamicRoute } from "next/dist/shared/lib/router/utils";
import { getRouteRegex } from "next/dist/shared/lib/router/utils/route-regex";
import { removePathTrailingSlash } from "./utils";

export const resolveDynamicRoute = (pathname: string, pages: string[]) => {
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
};
