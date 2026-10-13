import { content, type NavKey } from "@duoduo/content";

export const NAV_HREF: Record<NavKey, string> = {
  home: "/",
  farewell: "/farewell",
  about: "/about",
  stories: "/stories",
  whispers: "/whispers",
  partner: "/partner",
};

export const NAV = content.nav.map((n) => ({ ...n, href: NAV_HREF[n.key] }));

/** 目前所在區段：/farewell/* → 好好告別、/stories/* → 新生故事、/whispers/* → 朵朵曉語 */
export function activeSection(pathname: string): NavKey | null {
  if (pathname === "/") return "home";
  const first = pathname.split("/")[1] as NavKey;
  return first in NAV_HREF ? first : null;
}
