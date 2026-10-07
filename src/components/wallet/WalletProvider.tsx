"use client";

/* 钱包：EIP-6963 发现浏览器里的所有钱包，按「实际用来连接的那个钱包」判断是不是币安 Web3 钱包。
   连接后签一条登录消息（不花 gas），服务端据此计算免费次数与付费额度。 */
import { createStore, type EIP6963ProviderDetail } from "mipd";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPublicClient, createWalletClient, custom, erc20Abi, getAddress, http, numberToHex, parseUnits } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { createSiweMessage } from "viem/siwe";
import { ApiError, api, type Quota } from "@/lib/client/api";
import type { PublicConfig } from "@/lib/config";

type RequestArgs = { method: string; params?: unknown };
export interface Eip1193 {
  request(args: RequestArgs): Promise<unknown>;
  on?(event: string, cb: (...args: unknown[]) => void): void;
  removeListener?(event: string, cb: (...args: unknown[]) => void): void;
  isBinance?: boolean;
}

export interface WalletOption {
  id: string;
  name: string;
  icon?: string;
  provider: Eip1193;
  isBinance: boolean;
}

type Status = "idle" | "connecting" | "signing" | "ready";

interface WalletState {
  config: PublicConfig;
  options: WalletOption[];
  /** 当前页面是不是在币安 App 的 Web3 钱包浏览器里打开的。 */
  inBinanceApp: boolean;
  status: Status;
  address: `0x${string}` | null;
  wallet: "binance" | "other" | null;
  quota: Quota | null;
  error: string | null;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  connect: (option: WalletOption) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setQuota: (q: Quota) => void;
  /** 支付一次解读：转 price 枚到收款地址，链上确认后由服务端记入额度。 */
  pay: (onStage?: (stage: "sign" | "confirm" | "verify") => void) => Promise<Quota>;
}

const Ctx = createContext<WalletState | null>(null);
const LAST_WALLET = "bfate:last-wallet";

const isBinanceInfo = (d: EIP6963ProviderDetail) => /binance/i.test(d.info.rdns) || /binance/i.test(d.info.name);

/* EIP-6963 钱包列表：mipd 的 store 本身就是外部数据源，直接用 useSyncExternalStore 订阅。 */
const NO_PROVIDERS: readonly EIP6963ProviderDetail[] = [];
let mipd: ReturnType<typeof createStore> | null = null;
const getMipd = () => (mipd ??= createStore());
const subscribeProviders = (cb: () => void) => getMipd().subscribe(cb);
const getProviders = () => getMipd().getProviders();
const getServerProviders = () => NO_PROVIDERS;

/* 老式注入（window.ethereum / 币安 App 的 window.binancew3w）：有些 App 内置浏览器注入得晚，订阅时补一次检查。 */
type InjectedWindow = { ethereum?: Eip1193; binancew3w?: { ethereum?: Eip1193 } };
const injected = () => (typeof window === "undefined" ? undefined : (window as unknown as InjectedWindow));
const subscribeInjected = (cb: () => void) => {
  const t = window.setTimeout(cb, 600);
  window.addEventListener("ethereum#initialized", cb);
  return () => {
    window.clearTimeout(t);
    window.removeEventListener("ethereum#initialized", cb);
  };
};
const getEth = () => injected()?.ethereum;
const getBinanceApp = () => injected()?.binancew3w?.ethereum;
const getServerInjected = () => undefined;

export function WalletProvider({ config, children }: { config: PublicConfig; children: ReactNode }) {
  const chain = config.chainId === 97 ? bscTestnet : bsc;
  const details = useSyncExternalStore(subscribeProviders, getProviders, getServerProviders);
  const legacyEth = useSyncExternalStore(subscribeInjected, getEth, getServerInjected);
  const legacyBinance = useSyncExternalStore(subscribeInjected, getBinanceApp, getServerInjected);
  const [status, setStatus] = useState<Status>("idle");
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [wallet, setWallet] = useState<"binance" | "other" | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const active = useRef<WalletOption | null>(null);

  const inBinanceApp = Boolean(legacyBinance) || Boolean(legacyEth?.isBinance);

  const options = useMemo<WalletOption[]>(() => {
    const list: WalletOption[] = details.map((d) => ({
      id: d.info.rdns || d.info.uuid,
      name: d.info.name,
      icon: d.info.icon,
      provider: d.provider as unknown as Eip1193,
      isBinance: isBinanceInfo(d) || Boolean((d.provider as unknown as Eip1193).isBinance),
    }));
    const known = new Set(list.map((o) => o.provider));
    if (legacyBinance && !known.has(legacyBinance)) {
      list.unshift({ id: "binance-app", name: "Binance Web3 钱包", provider: legacyBinance, isBinance: true });
      known.add(legacyBinance);
    }
    if (legacyEth && !known.has(legacyEth) && list.length === 0) {
      list.push({ id: "injected", name: legacyEth.isBinance ? "Binance Web3 钱包" : "浏览器钱包", provider: legacyEth, isBinance: Boolean(legacyEth.isBinance) });
    }
    // 币安排第一，提示免费。
    return list.sort((a, b) => Number(b.isBinance) - Number(a.isBinance));
  }, [details, legacyBinance, legacyEth]);

  const applyMe = useCallback((me: Awaited<ReturnType<typeof api.me>>) => {
    if (me.session) {
      setAddress(me.session.address);
      setWallet(me.session.wallet);
      setQuota(me.quota ?? null);
      setStatus("ready");
    } else {
      setAddress(null);
      setWallet(null);
      setQuota(null);
      setStatus("idle");
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      applyMe(await api.me());
    } catch {
      /* 网络抖动时保留现状 */
    }
  }, [applyMe]);

  // 打开页面时恢复会话（Cookie 还在就不用重新签名）。
  useEffect(() => {
    let alive = true;
    api
      .me()
      .then((me) => alive && applyMe(me))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [applyMe]);

  // 已登录时，找回上次用的那个钱包，用于付款。
  useEffect(() => {
    if (active.current || !address || options.length === 0) return;
    const last = typeof window !== "undefined" ? window.localStorage.getItem(LAST_WALLET) : null;
    active.current = options.find((o) => o.id === last) ?? options.find((o) => o.isBinance === (wallet === "binance")) ?? options[0];
  }, [address, options, wallet]);

  const ensureChain = useCallback(
    async (p: Eip1193) => {
      const hex = numberToHex(chain.id);
      const current = (await p.request({ method: "eth_chainId" })) as string;
      if (current?.toLowerCase() === hex) return;
      try {
        await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
      } catch (e) {
        if ((e as { code?: number }).code !== 4902) throw e;
        await p.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hex,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: chain.rpcUrls.default.http,
              blockExplorerUrls: [chain.blockExplorers?.default.url],
            },
          ],
        });
      }
    },
    [chain],
  );

  const connect = useCallback(
    async (option: WalletOption) => {
      setError(null);
      setStatus("connecting");
      try {
        const accounts = (await option.provider.request({ method: "eth_requestAccounts" })) as string[];
        if (!accounts?.[0]) throw new Error("没有拿到钱包地址");
        const account = getAddress(accounts[0]);
        await ensureChain(option.provider).catch(() => undefined);
        setStatus("signing");
        const { nonce } = await api.nonce();
        const message = createSiweMessage({
          domain: window.location.host,
          address: account,
          statement: `登录 ${config.siteName}：仅用于确认钱包归属，不会发起交易，也不会产生任何费用。`,
          uri: window.location.origin,
          version: "1",
          chainId: chain.id,
          nonce,
          issuedAt: new Date(),
        });
        const walletClient = createWalletClient({ account, chain, transport: custom(option.provider) });
        const signature = await walletClient.signMessage({ account, message });
        const res = await api.verify(message, signature, option.isBinance ? "binance" : "other");
        active.current = option;
        window.localStorage.setItem(LAST_WALLET, option.id);
        setAddress(res.address);
        setWallet(res.wallet);
        setQuota(res.quota);
        setStatus("ready");
        setPickerOpen(false);
      } catch (e) {
        const code = (e as { code?: number }).code;
        setError(code === 4001 ? "你取消了钱包操作" : e instanceof ApiError ? e.message : "连接失败，请重试");
        setStatus(address ? "ready" : "idle");
      }
    },
    [address, chain, config.siteName, ensureChain],
  );

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    active.current = null;
    setAddress(null);
    setWallet(null);
    setQuota(null);
    setStatus("idle");
  }, []);

  // 钱包里切换了账户：会话作废，请用户重新签名。
  useEffect(() => {
    const p = active.current?.provider;
    if (!p?.on || !address) return;
    const onAccounts = (...args: unknown[]) => {
      const list = args[0] as string[] | undefined;
      if (!list?.[0] || list[0].toLowerCase() !== address.toLowerCase()) void logout();
    };
    p.on("accountsChanged", onAccounts);
    return () => p.removeListener?.("accountsChanged", onAccounts);
  }, [address, logout]);

  const pay = useCallback(
    async (onStage?: (stage: "sign" | "confirm" | "verify") => void) => {
      if (!config.token) throw new Error("代币地址尚未公布，付费通道即将开放");
      if (!address) throw new Error("请先连接钱包");
      const option = active.current;
      if (!option) {
        setPickerOpen(true);
        throw new Error("请重新选择钱包");
      }
      await ensureChain(option.provider);
      onStage?.("sign");
      const walletClient = createWalletClient({ account: address, chain, transport: custom(option.provider) });
      const hash = await walletClient.writeContract({
        address: config.token,
        abi: erc20Abi,
        functionName: "transfer",
        args: [config.payTo, parseUnits(String(config.price), config.tokenDecimals)],
        account: address,
        chain,
      });
      onStage?.("confirm");
      const pc = createPublicClient({ chain, transport: http() });
      await pc.waitForTransactionReceipt({ hash, confirmations: 2, timeout: 120_000 });
      onStage?.("verify");
      for (let i = 0; i < 12; i++) {
        try {
          const res = await api.payVerify(hash);
          setQuota(res.quota);
          return res.quota;
        } catch (e) {
          if (!(e instanceof ApiError) || e.status !== 425) throw e;
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      throw new Error("链上确认较慢，请稍后在「我的」页面刷新");
    },
    [address, chain, config, ensureChain],
  );

  const value: WalletState = {
    config,
    options,
    inBinanceApp,
    status,
    address,
    wallet,
    quota,
    error,
    pickerOpen,
    openPicker: () => {
      setError(null);
      setPickerOpen(true);
    },
    closePicker: () => setPickerOpen(false),
    connect,
    logout,
    refresh,
    setQuota,
    pay,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used inside WalletProvider");
  return v;
}
