import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { publicConfig } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${publicConfig.siteName} · 今日运势与姻缘合盘`,
  description: `求一支今日签，看十二时辰运势K线；两人生辰合盘，测姻缘。Binance Web3 钱包每日免费，其他钱包每次 ${publicConfig.price} $${publicConfig.tokenSymbol}。`,
  icons: { icon: "/seal.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4eee2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-dvh flex-col antialiased">
        <WalletProvider config={publicConfig}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <ConnectModal />
        </WalletProvider>
      </body>
    </html>
  );
}
