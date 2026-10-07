/* 站点配置：公开的（前端可见）都以 NEXT_PUBLIC_ 开头；密钥类只在服务端读取。 */
import { getAddress, isAddress } from "viem";

const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const addr = (v: string | undefined, d: `0x${string}`): `0x${string}` => (v && isAddress(v) ? getAddress(v) : d);

export const DEAD = "0x000000000000000000000000000000000000dEaD" as const;

export const publicConfig = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "BFATE",
  chainId: num(process.env.NEXT_PUBLIC_CHAIN_ID, 56),
  /** $BFATE 合约地址；未配置时付费入口显示「即将开放」。 */
  token: process.env.NEXT_PUBLIC_BFATE_TOKEN && isAddress(process.env.NEXT_PUBLIC_BFATE_TOKEN) ? getAddress(process.env.NEXT_PUBLIC_BFATE_TOKEN) : null,
  tokenDecimals: num(process.env.NEXT_PUBLIC_BFATE_DECIMALS, 18),
  tokenSymbol: process.env.NEXT_PUBLIC_BFATE_SYMBOL || "BFATE",
  /** 每次解读的价格（整数枚）。 */
  price: num(process.env.NEXT_PUBLIC_PRICE_PER_READING, 1000),
  /** 付费去向：默认打入黑洞销毁。 */
  payTo: addr(process.env.NEXT_PUBLIC_PAY_TO, DEAD),
  /** 每日免费次数：币安 Web3 钱包 / 其他钱包。 */
  freeDailyBinance: num(process.env.NEXT_PUBLIC_FREE_DAILY_BINANCE, 5),
  freeDailyOther: num(process.env.NEXT_PUBLIC_FREE_DAILY_OTHER, 0),
  /** 换日所用时区。 */
  timeZone: process.env.NEXT_PUBLIC_TIME_ZONE || "Asia/Shanghai",
};

export type PublicConfig = typeof publicConfig;

export function serverConfig() {
  return {
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org",
    sessionSecret: process.env.SESSION_SECRET || "",
    /** 同一 IP 每天最多领取的免费次数，防止批量换地址刷免费。 */
    freePerIpDaily: num(process.env.FREE_DAILY_PER_IP, 30),
    /** 付款需要的确认块数。 */
    confirmations: num(process.env.PAY_CONFIRMATIONS, 2),
    anthropicKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicModel: process.env.ANTHROPIC_MODEL || "",
  };
}
