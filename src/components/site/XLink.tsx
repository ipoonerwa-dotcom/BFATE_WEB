import { publicConfig } from "@/lib/config";

export function XLogo({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** 官方 X 账号链接。icon：只显示图标（顶栏）；否则显示「官方 X @账号」。 */
export function XLink({ icon = false, className = "" }: { icon?: boolean; className?: string }) {
  if (icon) {
    return (
      <a
        href={publicConfig.xUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`官方 X ${publicConfig.xHandle}`}
        title={`官方 X ${publicConfig.xHandle}`}
        className={`grid h-[34px] w-[34px] place-items-center rounded-[3px] border border-gold/45 bg-[rgba(255,251,240,0.75)] text-ink-2 transition-colors hover:border-ink/60 hover:text-ink ${className}`}
      >
        <XLogo size={15} />
      </a>
    );
  }
  return (
    <a
      href={publicConfig.xUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-ink-2 underline-offset-4 transition-colors hover:text-cinnabar hover:underline ${className}`}
    >
      <XLogo size={13} />
      <span>官方 X {publicConfig.xHandle}</span>
    </a>
  );
}
