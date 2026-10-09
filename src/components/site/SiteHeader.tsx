"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Seal } from "@/components/ink/Seal";
import { XLink } from "@/components/site/XLink";
import { WalletChip } from "@/components/wallet/WalletChip";

const NAV = [
  { href: "/", label: "首页", icon: "home" },
  { href: "/fortune", label: "今日运势", icon: "qian" },
  { href: "/match", label: "姻缘合盘", icon: "thread" },
  { href: "/me", label: "我的", icon: "me" },
] as const;

function Icon({ name, active }: { name: (typeof NAV)[number]["icon"]; active: boolean }) {
  const c = active ? "#b3312a" : "#463f37";
  const common = { fill: "none", stroke: c, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {name === "home" && (
        <>
          <path {...common} d="M3 10.5 12 4l9 6.5" />
          <path {...common} d="M5.5 9v10.5h13V9" />
          <path {...common} d="M10 19.5v-5h4v5" />
        </>
      )}
      {name === "qian" && (
        <>
          <path {...common} d="M7 21h10l1.2-10H5.8z" />
          <path {...common} d="M9 11 8 3.5M12 11V2.5M15 11l1-7.5" />
        </>
      )}
      {name === "thread" && (
        <>
          <circle {...common} cx="6" cy="8" r="2.5" />
          <circle {...common} cx="18" cy="16" r="2.5" />
          <path {...common} d="M8 9.5c3 2 2 6 6 6.5 1.5.2 1.8.1 2-.4" />
        </>
      )}
      {name === "me" && (
        <>
          <circle {...common} cx="12" cy="8.5" r="3.5" />
          <path {...common} d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" />
        </>
      )}
    </svg>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-gold/30 bg-[rgba(244,238,224,0.82)] shadow-[0_8px_24px_-20px_rgba(70,48,20,0.6)] backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Seal text="知命" size={30} />
            <span className="text-[19px] font-semibold leading-none tracking-[0.24em] text-ink">BFATE</span>
          </Link>
          <nav className="ml-8 hidden items-center gap-2 md:flex">
            {NAV.map((n) => {
              const active = isActive(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`relative px-3 py-1.5 text-[15px] tracking-[0.12em] transition-colors ${active ? "text-cinnabar" : "text-ink-2 hover:text-ink"}`}
                >
                  {n.label}
                  <i
                    className={`absolute -bottom-0.5 left-1/2 h-[5px] w-[5px] -translate-x-1/2 rotate-45 bg-cinnabar transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                  />
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <XLink icon />
            <WalletChip />
          </div>
        </div>
      </header>

      {/* 手机底部导航：像 App 一样单手可达。 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/35 bg-[rgba(244,238,224,0.9)] shadow-[0_-8px_24px_-18px_rgba(70,48,20,0.55)] backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid h-16 grid-cols-4">
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link key={n.href} href={n.href} className="relative flex flex-col items-center justify-center gap-0.5">
                <i className={`absolute top-0 h-[2px] w-7 bg-cinnabar transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
                <Icon name={n.icon} active={active} />
                <span className={`text-[11px] tracking-[0.1em] ${active ? "text-cinnabar" : "text-ink-2"}`}>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
