# BFATE · 今日运势与姻缘合盘

国风水墨风格的运势网站：用户连接钱包、填写生辰，摇出今日之签（附十二时辰运势 K 线），或两人合盘测姻缘（附未来十二个月姻缘 K 线）。

**收费规则一句话：Binance Web3 钱包每日免费 5 次，其他钱包每次 1000 $BFATE（默认直接销毁）。** 数字都可在环境变量里改。

## 功能

| 页面 | 内容 |
|---|---|
| `/` 首页 | 三层水墨山水首屏（视差、流云、飞鹤、扁舟）、今日黄历（宜忌、冲煞、财神喜神方位、十二时辰吉凶，不用连钱包也能看）、玩法与收费说明 |
| `/fortune` 今日运势 | 3D 朱漆签筒摇签、签落筒前 → 立轴签文（原创签诗竖排、朱丝栏）、十神主题、总运与事业/财运/感情/健康、十二时辰 K 线、幸运色数方位、个人宜忌、本人八字 |
| `/match` 姻缘合盘 | 两人生辰 → 红线同心结动画 → 缘分指数、五维雷达、命盘细节（生肖/日主/夫妻宫/五行互补）、姻缘 K 线、两人八字 |
| `/me` 我的 | 今日免费次数、已购次数、付费、历史解读 |
| `/r/[id]` 分享页 | 只读分享，不含钱包地址 |

命理计算基于 [lunar-javascript](https://github.com/6tail/lunar-javascript)（农历、八字、黄历宜忌、十二时辰吉凶），规则在 `src/lib/fate/`；结果对同一个人、同一天是确定的（每日一签）。

## 免费与付费是怎么判定的

1. **连接钱包后签名一次**（SIWE，不发交易、不花 gas），服务端据此确认地址归属并发放会话 Cookie。
2. **是否为币安 Web3 钱包**按用户**实际用来连接的那个钱包**判断：币安 App 内置浏览器里注入的 `window.ethereum.isBinance` / `window.binancew3w`，或浏览器插件通过 EIP-6963 自报的身份。
   ⚠️ 这一判断发生在前端，**技术上可以伪造**（链上无法区分钱包软件），所以免费额度同时受两道限制：每个地址每天 N 次、每个 IP 每天 `FREE_DAILY_PER_IP` 次。
3. **付费**：用户向收款地址（默认黑洞）转 1000 $BFATE，服务端到链上读取回执，确认「本人 → 收款地址、金额足够、已确认 2 块、这笔交易没用过」后记 1 次额度。
4. 同一天同一份生辰再看今日签、同一月同一对组合再看合盘，**命中缓存不计次**。

## 本地运行

```bash
npm install
cp .env.example .env.local   # 本地可以只留 NEXT_PUBLIC_* 几项
npm run dev
```

本地没配 Redis 时自动用内存存储（重启即清空）；线上必须配置 Upstash Redis。

自测脚本（需先启动 dev）：

```bash
npx tsx scripts/e2e-api.mts http://127.0.0.1:3000          # 登录、免费次数、缓存、402、分享、历史、权限
npx tsx scripts/test-payment-core.mts                     # 拿 BSC 主网真实转账回执校验付款计数逻辑
npx tsx scripts/demo-readings.mts http://127.0.0.1:3000   # 生成示例签与合盘，打印分享链接
```

## 部署（GitHub → Vercel）

1. Vercel → **Add New → Project** → 导入本仓库（框架会自动识别为 Next.js，构建命令、输出目录都不用改）。
2. 项目建好后：**Storage → Create Database → Upstash（Redis）** → 连接到本项目。会自动注入 `KV_REST_API_URL` / `KV_REST_API_TOKEN`。**线上不配 Redis 时所有接口都会报错**（故意的：内存存储一重启就丢数据）。
3. **Settings → Environment Variables** 至少加一项：
   - `SESSION_SECRET`：32 位以上随机串，可以在本机生成：`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   - 其余都有默认值（BSC 主网、每次 1000 枚、币安钱包每日 5 次、付款打黑洞），要改再按 `.env.example` 加。
4. **Deployments → Redeploy**（加完环境变量要重新部署一次才生效）。
5. 可选：`ANTHROPIC_API_KEY` 开启「先生细说」AI 解读（默认模型 `claude-opus-5-5`，可用 `ANTHROPIC_MODEL` 更换；开启了 Anthropic 服务端拒答兜底）。解读在出签后异步生成，每份只生成一次；未配置时页面只显示规则文案。
6. **Settings → Domains** 绑定域名。

### 代币合约出来以后

不用改代码：在 Vercel 环境变量里加 `NEXT_PUBLIC_BFATE_TOKEN=合约地址`（精度不是 18 的再加 `NEXT_PUBLIC_BFATE_DECIMALS`；付款不打黑洞而是进项目钱包的，加 `NEXT_PUBLIC_PAY_TO`），然后 **Redeploy**。
`NEXT_PUBLIC_` 开头的变量是构建时写进页面的，**必须重新部署**才会生效；生效后付费入口自动从「即将开放」变成可付款。

## 字体

两款字体都是 SIL Open Font License 1.1，许可证随字体放在 `public/fonts/`：

- 毛笔字：马善政楷书（`OFL-MaShanZheng.txt`），裁成 `brush-core`（标题按钮）、`brush-poem`（签诗，出签时才下载）、`brush-rest`（兜底）。
- 正文：思源宋体 Noto Serif SC（`OFL-NotoSerifSC.txt`），裁成 `serif-ui`（界面与黄历用字）、`serif-text`（解读文案，结果页才下载）。

只收网站真正用到的字，用 `unicode-range` 按需加载。改了页面文案、签诗或解读文案后重新生成：

```bash
# 首次需要下载字体源文件到 fonts-src/（不入库）
curl -L -o fonts-src/MaShanZheng-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf
curl -L -o fonts-src/NotoSerifSC-Regular.otf https://github.com/notofonts/noto-cjk/raw/refs/heads/main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf
pip install fonttools brotli
node scripts/lunar-vocab.mjs     # 只有改了黄历字段才需要
python scripts/subset-font.py
```

## 美术素材

`public/art/` 里的图全部由脚本程序化生成（不依赖任何图库，可复现）：

```bash
pip install numpy scipy opencv-python pillow
python scripts/gen-art.py            # 宣纸纹、洒金、飞白/印泥遮罩、朱日、云雾、三层水墨山水（桌面横版 + 手机竖版）
python scripts/gen-qiantong.py       # 3D 签筒的朱漆描金贴图、竹签贴图
```

签筒的加载占位图 `qt-still.webp` 是 3D 场景的正面截图（WebGL 不可用的设备也显示它）；改了签筒模型或贴图后需要重新截一张。

## 目录

```
src/lib/fate/        排盘、黄历、今日运势、合盘引擎与文案库（签诗为原创）
src/lib/server/      会话（SIWE）、次数、付款核验、存储、AI 解读、接口公用
src/lib/client/      前端接口封装与格式化
src/components/      首屏山水、印章、3D 签筒（three.js，按需加载）、立轴签文、K 线、雷达、钱包、结果页
src/app/             页面与 /api 接口
public/art/          程序化生成的纹理与山水分层图
public/fonts/        字体子集与许可证
scripts/             美术生成、字体子集、黄历用字、自测脚本
```

> 内容基于传统黄历与八字规则推演，仅供娱乐参考，不构成任何投资或人生决策建议。
