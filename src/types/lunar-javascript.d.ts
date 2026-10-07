// lunar-javascript ships without type definitions; it is only used server-side through src/lib/fate/bazi.ts.
declare module "lunar-javascript" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Solar: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Lunar: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const LunarUtil: any;
}
