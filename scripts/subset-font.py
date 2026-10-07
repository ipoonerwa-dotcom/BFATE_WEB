"""把网站用到的字裁成小字体文件，用 unicode-range 按需加载。

毛笔字：马善政楷书（SIL OFL 1.1）
  brush-core.woff2  标题、按钮、印章、干支/生肖/方位/农历等常驻毛笔字（几乎每页都用）
  brush-poem.woff2  签诗里独有的字（只有出签时才下载）
  brush-rest.woff2  其余在组件源码里出现过的字（兜底：只有真的以毛笔字显示时才会下载）

宋体：思源宋体 Noto Serif SC（SIL OFL 1.1）
  serif-ui.woff2    界面文案 + 黄历用字（首页就会用到）
  serif-text.woff2  解读文案里其余的字（结果页才下载）

改了页面文案、签诗、解读文案或黄历字段后重新运行：
    node scripts/lunar-vocab.mjs   （只有改了黄历字段才需要）
    python scripts/subset-font.py
需要：pip install fonttools brotli；字体源文件放在 fonts-src/（不入库）。
"""
import re
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
BRUSH_SRC = ROOT / "fonts-src" / "MaShanZheng-Regular.ttf"
SERIF_SRC = ROOT / "fonts-src" / "NotoSerifSC-Regular.otf"
OUT_DIR = ROOT / "public" / "fonts"
CSS_OUT = ROOT / "src" / "app" / "fonts.css"

CJK = re.compile(r"[　-〿㐀-鿿＀-￯]")


def cjk(s: str) -> set[str]:
    return set(CJK.findall(s))


tsx = {f: f.read_text(encoding="utf-8") for f in (ROOT / "src").rglob("*.tsx")}
libs = {f: f.read_text(encoding="utf-8") for f in (ROOT / "src").rglob("*.ts")}
texts = (ROOT / "src" / "lib" / "fate" / "texts.ts").read_text(encoding="utf-8")
lunar = cjk((ROOT / "scripts" / "lunar-vocab.txt").read_text(encoding="utf-8"))
ascii_chars = {chr(c) for c in range(32, 127)}
punct = set("“”‘’—…·•→←×√〇")

# ── 毛笔字 core：毛笔字出现的地方后面紧跟的文字，以及运行时的固定字集。
core: set[str] = set()
for src in tsx.values():
    for m in re.finditer(r"font-brush|btn-seal|btn-ink|<Seal|<Brush|panel-title|className=\"choice|--font-brush", src):
        core |= cjk(src[m.start() : m.start() + 260])
core |= cjk("甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥鼠牛虎兔龙蛇马羊猴鸡狗猪木火土金水")
core |= cjk("东南西北中正偏冬腊闰月初廿卅一二三四五六七八九十零百第签时宜忌吉凶〇年日旺乾坤男女")
core |= cjk("青绿朱红赭黄月白玄事业财运感情健康性格契合沟通默契财运互助家庭长久心动指数")
for m in re.finditer(r'(?:title|level):\s*"([^"]+)"', texts):
    core |= cjk(m.group(1))
poems = texts[texts.index("QIAN_POEMS") : texts.index("QIAN_JIE")]
poem = cjk(poems) - core
rest = set()
for src in tsx.values():
    rest |= cjk(src)
rest -= core | poem

# ── 宋体：界面 + 黄历先下，解读文案后下。
serif_ui = lunar.copy()
for src in tsx.values():
    serif_ui |= cjk(src)
serif_text = set()
for src in libs.values():
    serif_text |= cjk(src)
serif_text -= serif_ui


def build(src: Path, name: str, chars: set[str], extra: set[str] = frozenset()) -> tuple[str, str]:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.notdef_outline = True
    font = subset.load_font(str(src), opts)
    sub = subset.Subsetter(opts)
    sub.populate(text="".join(sorted(chars | extra)))
    sub.subset(font)
    out = OUT_DIR / f"{name}.woff2"
    subset.save_font(font, str(out), opts)
    cmap = font.getBestCmap() or {}
    codes = sorted(c for c in (ord(ch) for ch in chars | extra) if c in cmap)
    ranges = ",".join(f"U+{c:04X}" for c in codes)
    print(f"{name}.woff2: {len(codes)} 字 · {out.stat().st_size / 1024:.1f} KB")
    return out.name, ranges


for f in (BRUSH_SRC, SERIF_SRC):
    if not f.exists():
        sys.exit(f"缺少字体源文件 {f}")
OUT_DIR.mkdir(parents=True, exist_ok=True)

faces = [
    ("BfateBrush", build(BRUSH_SRC, "brush-core", core, ascii_chars | punct)),
    ("BfateBrush", build(BRUSH_SRC, "brush-poem", poem)),
    ("BfateBrush", build(BRUSH_SRC, "brush-rest", rest)),
    # 思源宋体自带的西文与数字（衬线、等高数字）也一并收进来，中西文风格一致。
    ("BfateSerif", build(SERIF_SRC, "serif-ui", serif_ui, ascii_chars | punct)),
    ("BfateSerif", build(SERIF_SRC, "serif-text", serif_text)),
]
css = ["/* 由 scripts/subset-font.py 生成，请勿手改。 */"]
for family, (file, ranges) in faces:
    if not ranges:
        continue
    css.append(
        "@font-face {\n"
        f'  font-family: "{family}";\n'
        f'  src: url("/fonts/{file}") format("woff2");\n'
        "  font-display: swap;\n"
        f"  unicode-range: {ranges};\n"
        "}"
    )
CSS_OUT.write_text("\n".join(css) + "\n", encoding="utf-8")
for old in (ROOT / "src" / "app" / "brush-font.css", OUT_DIR / "brush.woff2"):
    if old.exists():
        old.unlink()
print(f"写入 {CSS_OUT.relative_to(ROOT)}")
