/* 3D 签筒：朱漆描金的筒身、二十多支竹签。
   idle：缓缓转动；shaking：前倾摇动、竹签上下跳；drawn：一支签滑出筒口、落在筒前，然后回调 onLanded。
   只在可见时渲染；WebGL 不可用时抛错，由外层换成静态图。 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type TubeState = "idle" | "shaking" | "drawn";

export interface QiantongHandle {
  setState(state: TubeState, opts?: { label?: string; instant?: boolean }): void;
  dispose(): void;
  snapshot(): string;
}

interface Options {
  onLanded?: () => void;
  onReady?: () => void;
}

const CUP_H = 2.0;
const STICK_L = 2.25;
const STICK_W = 0.075;
const STICK_T = 0.016;
const FLOOR_Y = 0.32; // 筒内底

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const easeOutBack = (x: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** 伪随机：同一个种子每次都一样，签的摆放才稳定。 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lathe(points: [number, number][], segments: number, uvFromHeight: boolean) {
  const geo = new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
    Math.PI,
    Math.PI * 2,
  );
  if (uvFromHeight) {
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, pos.getY(i) / CUP_H);
    uv.needsUpdate = true;
  }
  return geo;
}

export async function mountQiantong(host: HTMLElement, opts: Options = {}): Promise<QiantongHandle> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.cursor = "pointer";
  canvas.style.touchAction = "manipulation";

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.62;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);

  // 灯：暖色主光（投影）+ 冷色轮廓光 + 天地补光
  const key = new THREE.DirectionalLight(0xfff0d8, 2.6);
  key.position.set(-2.6, 5.4, 3.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 14;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdce6ff, 1.25);
  rim.position.set(3.2, 3.2, -4);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff7ea, 0x7a5c3a, 0.55));

  const loader = new THREE.TextureLoader();
  const [cupTex, ormTex, stickTex] = await Promise.all([
    loader.loadAsync("/art/qt-cup.webp"),
    loader.loadAsync("/art/qt-cup-orm.webp"),
    loader.loadAsync("/art/qt-stick.webp"),
  ]);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  cupTex.colorSpace = THREE.SRGBColorSpace;
  stickTex.colorSpace = THREE.SRGBColorSpace;
  for (const t of [cupTex, ormTex, stickTex]) t.anisotropy = aniso;

  // ── 签筒 ──
  const pivot = new THREE.Group(); // 摇动的转轴在筒身中部
  pivot.position.set(0, 1.0, 0);
  scene.add(pivot);
  const cup = new THREE.Group();
  cup.position.y = -1.0;
  pivot.add(cup);

  const lacquer = new THREE.MeshPhysicalMaterial({
    map: cupTex,
    roughnessMap: ormTex,
    metalnessMap: ormTex,
    roughness: 1,
    metalness: 1,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
  });
  const outer = new THREE.Mesh(
    lathe(
      [
        [0.62, 0.0],
        [0.625, 0.045],
        [0.595, 0.075],
        [0.572, 0.12],
        [0.575, 0.6],
        [0.585, 1.2],
        [0.598, 1.8],
        [0.6, 1.93],
        [0.617, 1.955],
        [0.62, 2.0],
      ],
      128,
      true,
    ),
    lacquer,
  );
  outer.castShadow = true;
  outer.receiveShadow = true;
  cup.add(outer);

  const innerMat = new THREE.MeshStandardMaterial({ color: 0x2a0d09, roughness: 0.55, metalness: 0, side: THREE.DoubleSide });
  const inner = new THREE.Mesh(
    lathe(
      [
        [0.57, 2.0],
        [0.555, 1.9],
        [0.535, FLOOR_Y + 0.05],
        [0.0, FLOOR_Y],
      ],
      96,
      false,
    ),
    innerMat,
  );
  inner.receiveShadow = true;
  cup.add(inner);

  const gold = new THREE.MeshStandardMaterial({ color: 0xd1a552, metalness: 1, roughness: 0.26 });
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.595, 0.028, 16, 128), gold);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 2.0;
  lip.castShadow = true;
  cup.add(lip);
  const foot = new THREE.Mesh(new THREE.TorusGeometry(0.618, 0.022, 12, 128), gold);
  foot.rotation.x = Math.PI / 2;
  foot.position.y = 0.03;
  cup.add(foot);

  // ── 竹签 ──
  const stickGeo = new THREE.BoxGeometry(STICK_W, STICK_L, STICK_T);
  const stickMat = new THREE.MeshStandardMaterial({ map: stickTex, roughness: 0.62, metalness: 0 });
  type Stick = { mesh: THREE.Mesh; base: THREE.Vector3; dir: THREE.Vector3; quat: THREE.Quaternion; f: number; ph: number; lift: number };
  const sticks: Stick[] = [];
  const rand = rng(20261007);
  const up = new THREE.Vector3(0, 1, 0);
  const placeStick = (x: number, z: number, lift: number, lean: number, twist: number, mat: THREE.Material) => {
    const base = new THREE.Vector3(x, FLOOR_Y, z);
    const out = new THREE.Vector3(x, 0, z);
    const d = out.length() > 1e-3 ? out.normalize() : new THREE.Vector3(1, 0, 0);
    const dir = new THREE.Vector3(d.x * lean, 1, d.z * lean).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    quat.multiply(new THREE.Quaternion().setFromAxisAngle(up, twist));
    const mesh = new THREE.Mesh(stickGeo, mat);
    mesh.castShadow = true;
    const s: Stick = { mesh, base, dir, quat, f: 9 + rand() * 7, ph: rand() * Math.PI * 2, lift };
    sticks.push(s);
    cup.add(mesh);
    return s;
  };
  // 签斜靠在筒口上：到筒口高度时离轴心不超过 0.5（筒口内半径约 0.55），露出筒口后才散开
  const rimRise = CUP_H - FLOOR_Y;
  const leanFor = (r: number, k: number) => Math.max(0.02, ((0.5 - r) / rimRise) * k);
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.36;
    placeStick(Math.cos(a) * r, Math.sin(a) * r, rand() * 0.2, leanFor(r, 0.75 + rand() * 0.25), rand() * Math.PI, stickMat);
  }
  // 被摇出来的那一支：放在靠前的位置，摇出来看得清。
  const chosenMat = stickMat.clone();
  const chosen = placeStick(0.06, 0.2, 0.12, leanFor(0.21, 0.9), 0.3, chosenMat);

  const setStickPose = (s: Stick, offset: number) => {
    s.mesh.quaternion.copy(s.quat);
    s.mesh.position.copy(s.base).addScaledVector(s.dir, STICK_L / 2 + s.lift + offset);
  };
  sticks.forEach((s) => setStickPose(s, 0));

  // ── 地面：只接影子；再垫一层柔和的接触阴影 ──
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const blobCanvas = document.createElement("canvas");
  blobCanvas.width = blobCanvas.height = 128;
  const bctx = blobCanvas.getContext("2d")!;
  const grad = bctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(40,22,10,0.55)");
  grad.addColorStop(0.55, "rgba(40,22,10,0.18)");
  grad.addColorStop(1, "rgba(40,22,10,0)");
  bctx.fillStyle = grad;
  bctx.fillRect(0, 0, 128, 128);
  const blobTex = new THREE.CanvasTexture(blobCanvas);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.002;
  scene.add(blob);

  // ── 签上的字（第几签）：画在签的贴图上 ──
  let labelTex: THREE.CanvasTexture | null = null;
  const setLabel = async (label?: string) => {
    if (!label) return;
    try {
      await document.fonts.load('48px "BfateBrush"', label);
    } catch {
      /* 字体没加载到就用系统楷体 */
    }
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 1024;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(stickTex.image as CanvasImageSource, 0, 0, 64, 1024);
    ctx.fillStyle = "#1b1410";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '46px "BfateBrush", "KaiTi", "STKaiti", serif';
    const chars = [...label];
    chars.forEach((ch, i) => {
      ctx.save();
      ctx.translate(32, 205 + i * 30);
      ctx.scale(1, 0.53); // 签很窄、贴图被横向压缩，字要先压扁才显得方正
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    labelTex?.dispose();
    labelTex = new THREE.CanvasTexture(c);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    labelTex.anisotropy = aniso;
    chosenMat.map = labelTex;
    chosenMat.needsUpdate = true;
  };

  // ── 签落地的位置与朝向：平躺在筒前，左前到右后斜放，整支都在画面里 ──
  const landPos = new THREE.Vector3(0.42, STICK_T / 2 + 0.002, 0.95);
  const landQuat = (() => {
    const a = -0.42;
    const Y = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).normalize();
    const Z = new THREE.Vector3(0, 1, 0);
    const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  })();

  // ── 状态机 ──
  let phase: "idle" | "shake" | "eject" | "fly" | "landed" = "idle";
  let t0 = performance.now() / 1000;
  let flyFrom: { p: THREE.Vector3; q: THREE.Quaternion } | null = null;
  let landedFired = false;
  let pointerX = 0;
  let yaw = 0;
  let shakeK = 0; // 摇动强度
  let glowFrom = 0;
  let pivotFrom = { y: 1, rx: 0, rz: 0 };

  const reattachChosen = () => {
    if (chosen.mesh.parent !== cup) cup.add(chosen.mesh);
    setStickPose(chosen, 0);
  };
  const putChosenOnGround = () => {
    scene.attach(chosen.mesh);
    chosen.mesh.position.copy(landPos);
    chosen.mesh.quaternion.copy(landQuat);
  };

  const setState = (next: TubeState, o: { label?: string; instant?: boolean } = {}) => {
    void setLabel(o.label);
    const now = performance.now() / 1000;
    if (next === "idle") {
      reattachChosen();
      phase = "idle";
    } else if (next === "shaking") {
      if (phase === "landed" || chosen.mesh.parent !== cup) reattachChosen();
      phase = "shake";
      landedFired = false;
    } else if (next === "drawn") {
      if (o.instant || phase === "idle" || phase === "landed") {
        putChosenOnGround();
        phase = "landed";
        landedFired = true;
      } else if (phase === "shake") {
        phase = "eject";
        pivotFrom = { y: pivot.position.y, rx: pivot.rotation.x, rz: pivot.rotation.z };
      }
    }
    t0 = now;
    wake();
  };

  const onPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointerX = ((e.clientX - r.left) / r.width - 0.5) * 2;
    wake();
  };
  canvas.addEventListener("pointermove", onPointer);
  canvas.addEventListener("pointerleave", () => (pointerX = 0));

  // ── 渲染循环的状态（要在 fit / wake 第一次被调用之前声明） ──
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let tick = 0;

  // ── 尺寸与镜头 ──
  const fit = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = 7.6 * Math.max(1, 1.02 / camera.aspect);
    camera.position.set(0, 2.45 * (dist / 7.6), dist);
    camera.lookAt(0, 1.2, 0.5);
    camera.updateProjectionMatrix();
    wake();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  host.appendChild(canvas);
  fit();

  // ── 渲染循环：看不见就停 ──
  const io = new IntersectionObserver((es) => {
    visible = es.some((e) => e.isIntersecting);
    wake();
  });
  io.observe(host);
  function wake() {
    if (!raf && visible && document.visibilityState === "visible") {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  const onVis = () => wake();
  document.addEventListener("visibilitychange", onVis);

  function frame(nowMs: number) {
    raf = 0;
    if (!visible || document.visibilityState !== "visible") return;
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    const now = nowMs / 1000;
    const t = now - t0;

    // 偏航：平时缓缓转动，鼠标在画面上时略微转向鼠标
    const targetYaw = phase === "idle" || phase === "landed" ? 0.32 * Math.sin(now * 0.42) + pointerX * 0.25 : 0;
    yaw += (targetYaw - yaw) * Math.min(1, dt * 3);
    pivot.rotation.y = yaw;

    // 摇动强度按时间算（不按帧累加），掉帧或后台节流时姿态也是对的
    shakeK = phase === "shake" ? smooth(t / 0.4) : phase === "eject" ? 1 - smooth(t / 0.5) : 0;

    if (phase === "shake" || phase === "eject") {
      const k = shakeK;
      const w = 2 * Math.PI * 6.3;
      pivot.position.y = 1.0 + 0.24 * k + 0.035 * Math.sin(w * now) * k;
      pivot.rotation.x = 0.5 * k + (0.08 * Math.sin(w * now) + 0.022 * Math.sin(2 * Math.PI * 13 * now)) * k;
      pivot.rotation.z = 0.05 * Math.sin(2 * Math.PI * 3.1 * now) * k;
      for (const s of sticks) {
        if (s === chosen) continue;
        setStickPose(s, Math.max(0, Math.sin(2 * Math.PI * s.f * now + s.ph)) * 0.065 * k);
      }
      if (phase === "shake") {
        const rise = 0.28 * smooth((t - 0.4) / 2.2);
        setStickPose(chosen, rise + Math.max(0, Math.sin(2 * Math.PI * chosen.f * now)) * 0.05);
      } else {
        // 签从筒口滑出
        const e = Math.min(1, t / 0.5);
        setStickPose(chosen, 0.28 + 1.25 * e * e);
        if (t >= 0.5) {
          scene.attach(chosen.mesh);
          flyFrom = { p: chosen.mesh.position.clone(), q: chosen.mesh.quaternion.clone() };
          phase = "fly";
          t0 = now;
          pivotFrom = { y: pivot.position.y, rx: pivot.rotation.x, rz: pivot.rotation.z };
        }
      }
    } else if (phase === "fly" && flyFrom) {
      const T = 0.75;
      const e = Math.min(1, t / T);
      const ge = e * e * (1.6 - 0.6 * e); // 先慢后快，像被重力拽下来
      chosen.mesh.position.lerpVectors(flyFrom.p, landPos, ge);
      chosen.mesh.position.y += 0.55 * 4 * e * (1 - e) * (1 - e * 0.4);
      chosen.mesh.quaternion.slerpQuaternions(flyFrom.q, landQuat, smooth(e * 1.15));
      const b = Math.max(0, (t - T) / 0.36);
      if (b > 0 && b < 1) chosen.mesh.position.y = landPos.y + 0.09 * Math.sin(Math.PI * b) * (1 - b);
      if (t >= T + 0.36) {
        chosen.mesh.position.copy(landPos);
        chosen.mesh.quaternion.copy(landQuat);
        phase = "landed";
        glowFrom = now;
        if (!landedFired) {
          landedFired = true;
          opts.onLanded?.();
        }
      }
      // 筒回正
      const r = easeOutBack(Math.min(1, t / 0.9));
      pivot.position.y = pivotFrom.y + (1.0 - pivotFrom.y) * r;
      pivot.rotation.x = pivotFrom.rx * (1 - r);
      pivot.rotation.z = pivotFrom.rz * (1 - r);
      for (const s of sticks) if (s !== chosen) setStickPose(s, 0);
    } else {
      pivot.position.y += (1.0 - pivot.position.y) * Math.min(1, dt * 6);
      pivot.rotation.x += (0 - pivot.rotation.x) * Math.min(1, dt * 6);
      pivot.rotation.z += (0 - pivot.rotation.z) * Math.min(1, dt * 6);
    }

    // 签落地后泛起一阵金光，慢慢褪去
    const g = glowFrom ? Math.max(0, 1 - (now - glowFrom) / 1.6) : 0;
    chosenMat.emissive.setRGB(0.55 * g, 0.3 * g, 0.05 * g);
    if (glowFrom && g === 0) glowFrom = 0;

    // 接触阴影跟着筒走、抬起时变淡
    blob.position.x = pivot.position.x;
    (blob.material as THREE.MeshBasicMaterial).opacity = 1 - Math.min(0.6, (pivot.position.y - 1) * 2.2);

    // 静止时（只是缓缓转动）隔帧渲染，省电
    const calm = (phase === "idle" || phase === "landed") && Math.abs(pivot.rotation.x) < 0.01;
    if (!calm || tick++ % 2 === 0) renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
  wake();
  opts.onReady?.();

  return {
    setState,
    /** 静态图（正面、2 倍清晰度），给加载中与不支持 WebGL 的设备用 */
    snapshot: () => {
      const pr = renderer.getPixelRatio();
      const y = pivot.rotation.y;
      pivot.rotation.y = 0;
      renderer.setPixelRatio(2);
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      renderer.render(scene, camera);
      const url = canvas.toDataURL("image/png");
      renderer.setPixelRatio(pr);
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      pivot.rotation.y = y;
      return url;
    },
    dispose() {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onPointer);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      for (const t of [cupTex, ormTex, stickTex, blobTex]) t.dispose();
      labelTex?.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
