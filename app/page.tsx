"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";

type ReferenceKind = "person" | "desk" | "chair" | "door";

const REFERENCES: Record<
  ReferenceKind,
  { name: string; note: string; width: number; height: number; depth: number }
> = {
  person: {
    name: "Person",
    note: "Approx. 1.70 m tall",
    width: 0.46,
    height: 1.7,
    depth: 0.28
  },
  desk: {
    name: "Desk",
    note: "Approx. 1.20 × 0.60 × 0.74 m",
    width: 1.2,
    height: 0.74,
    depth: 0.6
  },
  chair: {
    name: "Chair",
    note: "Approx. 0.45 × 0.90 × 0.45 m",
    width: 0.45,
    height: 0.9,
    depth: 0.45
  },
  door: {
    name: "Door",
    note: "Approx. 0.91 × 2.03 m",
    width: 0.91,
    height: 2.03,
    depth: 0.045
  }
};

function PrinterModel({
  width,
  height,
  depth
}: {
  width: number;
  height: number;
  depth: number;
}) {
  const dark = "#202a35";
  const metal = "#8b9aa8";
  const bed = "#35495a";
  const baseH = height * 0.16;
  const frame = Math.max(0.012, Math.min(width, depth) * 0.055);
  const postH = Math.max(0.02, height - baseH - frame);
  const bedY = baseH + height * 0.12;
  const gantryY = height - frame * 1.4;

  return (
    <group>
      {/* Every part is contained by the dimensions supplied to this model. */}
      <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, baseH, depth]} />
        <meshStandardMaterial color={dark} roughness={0.42} metalness={0.24} />
      </mesh>
      <mesh position={[0, bedY, 0]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.78, frame * 0.55, depth * 0.72]} />
        <meshStandardMaterial color={bed} roughness={0.62} metalness={0.2} />
      </mesh>
      <mesh position={[-width / 2 + frame / 2, baseH + postH / 2, -depth * 0.34]} castShadow>
        <boxGeometry args={[frame, postH, frame]} />
        <meshStandardMaterial color={metal} metalness={0.62} roughness={0.3} />
      </mesh>
      <mesh position={[width / 2 - frame / 2, baseH + postH / 2, -depth * 0.34]} castShadow>
        <boxGeometry args={[frame, postH, frame]} />
        <meshStandardMaterial color={metal} metalness={0.62} roughness={0.3} />
      </mesh>
      <mesh position={[0, gantryY, -depth * 0.34]} castShadow>
        <boxGeometry args={[width * 0.9, frame, frame]} />
        <meshStandardMaterial color={metal} metalness={0.62} roughness={0.3} />
      </mesh>
      <mesh position={[0, gantryY - frame * 1.7, -depth * 0.22]} castShadow>
        <boxGeometry args={[width * 0.12, frame * 2.1, depth * 0.22]} />
        <meshStandardMaterial color="#d8e1e8" metalness={0.28} roughness={0.38} />
      </mesh>
      <mesh position={[width * 0.28, baseH * 0.52, depth / 2 + 0.001]} castShadow>
        <boxGeometry args={[width * 0.12, baseH * 0.48, 0.008]} />
        <meshStandardMaterial color="#17212b" roughness={0.45} />
      </mesh>
    </group>
  );
}

function ReferenceObject({ kind }: { kind: ReferenceKind }) {
  const item = REFERENCES[kind];
  const wood = "#9a7654";
  const dark = "#35424e";
  const leg = (x: number, z: number, y: number, h: number, size = 0.035) => (
    <mesh key={`${x}-${z}-${y}`} position={[x, y - h / 2, z]} castShadow>
      <boxGeometry args={[size, h, size]} />
      <meshStandardMaterial color={dark} roughness={0.5} />
    </mesh>
  );

  if (kind === "person") {
    const torsoH = item.height * 0.34;
    const headR = item.width * 0.16;
    return (
      <group position={[0, 0, 0]}>
        <mesh position={[0, item.height - headR, 0]} castShadow>
          <sphereGeometry args={[headR, 24, 18]} />
          <meshStandardMaterial color="#c99b79" roughness={0.8} />
        </mesh>
        <mesh position={[0, item.height * 0.59, 0]} castShadow>
          <capsuleGeometry args={[item.width * 0.19, torsoH * 0.75, 5, 12]} />
          <meshStandardMaterial color="#4f7895" roughness={0.75} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * item.width * 0.14, item.height * 0.29, 0]} castShadow>
              <capsuleGeometry args={[item.width * 0.075, item.height * 0.3, 4, 10]} />
              <meshStandardMaterial color="#293744" roughness={0.8} />
            </mesh>
            <mesh position={[side * item.width * 0.31, item.height * 0.59, 0]} rotation={[0, 0, -side * 0.12]} castShadow>
              <capsuleGeometry args={[item.width * 0.055, item.height * 0.22, 4, 10]} />
              <meshStandardMaterial color="#c99b79" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (kind === "door") {
    return (
      <group>
        <mesh position={[0, item.height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[item.width, item.height, item.depth]} />
          <meshStandardMaterial color="#b7a38b" roughness={0.75} />
        </mesh>
        <mesh position={[item.width * 0.34, item.height * 0.48, item.depth / 2 + 0.006]}>
          <sphereGeometry args={[0.018, 12, 10]} />
          <meshStandardMaterial color="#4e5b65" metalness={0.65} roughness={0.3} />
        </mesh>
      </group>
    );
  }

  if (kind === "desk") {
    const topH = 0.055;
    const legH = Math.max(0.1, item.height - topH);
    return (
      <group>
        <mesh position={[0, item.height - topH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[item.width, topH, item.depth]} />
          <meshStandardMaterial color={wood} roughness={0.7} />
        </mesh>
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) =>
            leg(x * (item.width / 2 - 0.06), z * (item.depth / 2 - 0.06), item.height - topH, legH, 0.045)
          )
        )}
      </group>
    );
  }

  const seatY = item.height * 0.48;
  const seatH = 0.055;
  const backH = item.height * 0.48;
  return (
    <group>
      <mesh position={[0, seatY, 0]} castShadow receiveShadow>
        <boxGeometry args={[item.width, seatH, item.depth]} />
        <meshStandardMaterial color="#536a7c" roughness={0.8} />
      </mesh>
      <mesh position={[0, seatY + backH / 2, -item.depth * 0.42]} castShadow>
        <boxGeometry args={[item.width, backH, 0.055]} />
        <meshStandardMaterial color="#536a7c" roughness={0.8} />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => leg(x * item.width * 0.39, z * item.depth * 0.39, seatY - seatH / 2, seatY - seatH / 2, 0.03))
      )}
    </group>
  );
}

function Scene({
  widthMm,
  heightMm,
  depthMm,
  reference
}: {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  reference: ReferenceKind;
}) {
  const printerW = widthMm / 1000;
  const printerH = heightMm / 1000;
  const printerD = depthMm / 1000;
  const ref = REFERENCES[reference];
  const gap = 0.32;
  const totalWidth = printerW + ref.width + gap;
  const printerX = -totalWidth / 2 + printerW / 2;
  const referenceX = totalWidth / 2 - ref.width / 2;
  const floorWidth = Math.max(2.8, totalWidth + 1.2);
  const floorDepth = Math.max(2.2, Math.max(printerD, ref.depth) + 1.5);

  return (
    <>
      <color attach="background" args={["#10161d"]} />
      <fog attach="fog" args={["#10161d", 5, 11]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[3.5, 5, 4]} intensity={2.3} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-3, 2, -3]} intensity={0.65} color="#8fb7d8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]} receiveShadow>
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial color="#202a34" roughness={0.88} />
      </mesh>
      <gridHelper args={[floorWidth, Math.round(floorWidth * 10), "#465360", "#2d3945"]} position={[0, 0.002, 0]} />
      <group position={[printerX, 0, 0]}>
        <PrinterModel width={printerW} height={printerH} depth={printerD} />
      </group>
      <group position={[referenceX, 0, 0]}>
        <ReferenceObject kind={reference} />
      </group>
      <ContactShadows position={[0, 0.004, 0]} opacity={0.42} scale={Math.max(3, totalWidth + 1)} blur={2.4} far={3} />
      <OrbitControls
        makeDefault
        target={[0, Math.max(printerH, ref.height) * 0.48, 0]}
        minDistance={1.5}
        maxDistance={8}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI * 0.49}
      />
    </>
  );
}

function formatMm(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export default function Home() {
  const [widthMm, setWidthMm] = useState(347);
  const [heightMm, setHeightMm] = useState(365);
  const [depthMm, setDepthMm] = useState(315);
  const [reference, setReference] = useState<ReferenceKind>("person");
  const ref = REFERENCES[reference];
  const footprint = useMemo(() => ((widthMm * depthMm) / 1_000_000).toFixed(3), [widthMm, depthMm]);

  const setDimension = (
    setter: (value: number) => void,
    value: string
  ) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 50 && parsed <= 2500) setter(parsed);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Ori Dimension home">
          <span className="brand-mark">O<span>↗</span></span>
          <span>ORI <b>DIMENSION</b></span>
        </a>
        <span className="topbar-note"><span className="status-dot" /> REAL-WORLD SCALE VIEWER</span>
      </header>

      <section className="intro">
        <div className="eyebrow">SIZE, MADE VISIBLE</div>
        <h1>How big is it, <span>really?</span></h1>
        <p>Put a 3D printer beside something familiar. Everything in the scene shares the same scale.</p>
      </section>

      <section className="workspace" aria-label="Printer size comparison">
        <div className="scene-panel">
          <div className="scene-head">
            <div>
              <span className="section-kicker">LIVE 3D SCENE</span>
              <h2>Printer <span className="muted">vs.</span> {ref.name.toLowerCase()}</h2>
            </div>
            <span className="unit-chip">1 scene unit = 1 metre</span>
          </div>
          <div className="scene-view">
            <Canvas
              shadows
              dpr={[1, 1.75]}
              camera={{ position: [2.8, 2.05, 3.6], fov: 37, near: 0.05, far: 100 }}
              gl={{ antialias: true, powerPreference: "high-performance" }}
            >
              <Suspense fallback={null}>
                <Scene
                  widthMm={widthMm}
                  heightMm={heightMm}
                  depthMm={depthMm}
                  reference={reference}
                />
              </Suspense>
            </Canvas>
            <div className="scene-hint"><span>↻</span> Drag to rotate <i /> Scroll to zoom</div>
            <div className="scale-legend"><span className="legend-printer" /> PRINTER <span className="legend-reference" /> SCALE OBJECT</div>
          </div>
          <div className="scene-footer">
            <span>SCHEMATIC PRINTER MODEL</span>
            <span>Dimensions control its outer size</span>
          </div>
        </div>

        <aside className="controls-panel">
          <div className="control-block">
            <div className="section-kicker">01 / PRINTER SIZE</div>
            <h2>Set the dimensions</h2>
            <p className="control-copy">Enter the printer’s external measurements. The 3D model updates proportionally.</p>
            <div className="dimension-grid">
              <label className="dimension-field">
                <span>Width <small>mm</small></span>
                <input type="number" min="50" max="2500" step="1" value={widthMm} onChange={(event) => setDimension(setWidthMm, event.target.value)} />
              </label>
              <label className="dimension-field">
                <span>Height <small>mm</small></span>
                <input type="number" min="50" max="2500" step="1" value={heightMm} onChange={(event) => setDimension(setHeightMm, event.target.value)} />
              </label>
              <label className="dimension-field">
                <span>Depth <small>mm</small></span>
                <input type="number" min="50" max="2500" step="1" value={depthMm} onChange={(event) => setDimension(setDepthMm, event.target.value)} />
              </label>
            </div>
            <button className="reset-button" onClick={() => { setWidthMm(347); setHeightMm(365); setDepthMm(315); }}>
              Reset example dimensions
            </button>
            <p className="fine-print">Example dimensions only. Replace with your printer’s verified external measurements.</p>
          </div>

          <div className="control-divider" />

          <div className="control-block">
            <div className="section-kicker">02 / SCALE OBJECT</div>
            <h2>Compare it with…</h2>
            <div className="reference-options" role="group" aria-label="Choose a scale object">
              {(Object.keys(REFERENCES) as ReferenceKind[]).map((key) => (
                <button
                  key={key}
                  className={reference === key ? "reference-option selected" : "reference-option"}
                  aria-pressed={reference === key}
                  onClick={() => setReference(key)}
                >
                  <span className={`reference-icon ${key}`} aria-hidden="true">
                    {key === "person" ? "↟" : key === "desk" ? "▱" : key === "chair" ? "⌑" : "▯"}
                  </span>
                  <span>{REFERENCES[key].name}</span>
                  <span className="option-check">{reference === key ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            <div className="reference-note">
              <span className="note-mark">i</span>
              <div><b>{ref.name} dimensions</b><p>{ref.note}. This is a reference estimate, not a universal standard.</p></div>
            </div>
          </div>

          <div className="control-divider" />

          <div className="control-block summary-block">
            <div className="section-kicker">03 / QUICK READ</div>
            <div className="summary-row"><span>Printer height</span><b>{formatMm(heightMm)} mm <small>({(heightMm / 1000).toFixed(2)} m)</small></b></div>
            <div className="summary-row"><span>Floor footprint</span><b>{footprint} m²</b></div>
            <div className="summary-row"><span>Reference height</span><b>{ref.height.toFixed(2)} m</b></div>
            <p className="fine-print">The scene is a proportional comparison, not a photorealistic model. Reference-object measurements are approximate.</p>
          </div>
        </aside>
      </section>

      <footer className="page-footer">
        <span>ORI DIMENSION <i>·</i> BUILT FOR REAL-WORLD SCALE</span>
        <span>All scene objects use the same unit system.</span>
      </footer>
    </main>
  );
}
