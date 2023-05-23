import { NextRouter } from "next/router";
import { isLocalURL } from "next/dist/shared/lib/router/utils/is-local-url";

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

export function linkClicked(
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
