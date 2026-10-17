"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

type ObjectSpec = { id: string; name: string; widthMm: number; heightMm: number; depthMm: number; note: string; prompt: string };
type SearchResult = { title: string; url: string; description: string };

function Plate({ widthMm, depthMm }: { widthMm: number; depthMm: number }) {
  const w = widthMm / 1000, d = depthMm / 1000;
  return <group>
    <mesh position={[0, 0.002, 0]} castShadow receiveShadow><boxGeometry args={[w, 0.004, d]} /><meshStandardMaterial color="#526575" metalness={0.4} roughness={0.5} /></mesh>
    <mesh position={[0, 0.0045, 0]}><boxGeometry args={[w * 0.985, 0.001, d * 0.985]} /><meshStandardMaterial color="#253b4b" roughness={0.7} /></mesh>
    <gridHelper args={[Math.max(w, d), Math.max(2, Math.round(Math.max(w, d) * 20)), "#7e9aaf", "#3e5668"]} position={[0, 0.0052, 0]} />
  </group>;
}

function SimpleObject({ spec }: { spec: ObjectSpec }) {
  const w = spec.widthMm / 1000, h = spec.heightMm / 1000, d = spec.depthMm / 1000;
  if (spec.id === "basketball") return <mesh position={[0,h/2,0]} castShadow><sphereGeometry args={[Math.min(w,h,d)/2,32,24]} /><meshStandardMaterial color="#b96e37" roughness={0.8} /></mesh>;
  if (spec.id === "mug") return <group>
    <mesh position={[0,h/2,0]}><cylinderGeometry args={[w*.46,w*.42,h,32,1,true]} /><meshStandardMaterial color="#9cb9c9" roughness={0.3} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0,h*.12,0]}><cylinderGeometry args={[w*.42,w*.42,h*.05,32]} /><meshStandardMaterial color="#9cb9c9" /></mesh>
    <mesh position={[w*.49,h*.53,0]}><torusGeometry args={[h*.19,w*.055,12,24]} /><meshStandardMaterial color="#9cb9c9" /></mesh>
  </group>;
  if (spec.id === "sneaker") return <group><mesh position={[0,h*.28,0]} castShadow><boxGeometry args={[w,h*.42,d*.94]} /><meshStandardMaterial color="#d5d9dd" /></mesh><mesh position={[0,h*.12,0]}><boxGeometry args={[w*1.02,h*.15,d]} /><meshStandardMaterial color="#8996a2" /></mesh></group>;
  if (spec.id === "laptop") return <group><mesh position={[0,h*.18,0]}><boxGeometry args={[w,h*.18,d]} /><meshStandardMaterial color="#8494a1" metalness={0.6} /></mesh><mesh position={[0,h*.58,-d*.42]} rotation={[-.12,0,0]}><boxGeometry args={[w*.98,h*.82,d*.08]} /><meshStandardMaterial color="#334756" /></mesh></group>;
  return <mesh position={[0,h/2,0]} castShadow><boxGeometry args={[w,h,d]} /><meshStandardMaterial color="#b18f70" roughness={0.7} /></mesh>;
}

function GeneratedObject({ url, spec }: { url: string; spec: ObjectSpec }) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => scene.clone(true), [scene]);
  const { scale, minY } = useMemo(() => {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    return {
      scale: [size.x ? (spec.widthMm / 1000) / size.x : 1, size.y ? (spec.heightMm / 1000) / size.y : 1, size.z ? (spec.depthMm / 1000) / size.z : 1] as [number,number,number],
      minY: box.min.y
    };
  }, [object, spec.widthMm, spec.heightMm, spec.depthMm]);
  return <primitive object={object} scale={scale} position={[0, -minY * scale[1] + 0.006, 0]} />;
}

function Scene({ widthMm, depthMm, spec, modelUrl }: { widthMm: number; depthMm: number; spec: ObjectSpec; modelUrl: string | null }) {
  const plateW = widthMm / 1000, plateD = depthMm / 1000;
  const objectW = spec.widthMm / 1000, objectD = spec.depthMm / 1000;
  const gap = Math.max(0.08, Math.max(plateW, objectW) * .28);
  const totalW = plateW + objectW + gap;
  const plateX = -totalW / 2 + plateW / 2, objectX = totalW / 2 - objectW / 2;
  const floorW = Math.max(1.4, totalW + .55), floorD = Math.max(1.1, Math.max(plateD, objectD) + .6);
  return <>
    <color attach="background" args={["#10161d"]} />
    <ambientLight intensity={1.35} />
    <directionalLight position={[2,3.5,3]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <directionalLight position={[-2,2,-2]} intensity={.6} color="#8fb7d8" />
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.002,0]} receiveShadow><planeGeometry args={[floorW,floorD]} /><meshStandardMaterial color="#202a34" roughness={.9} /></mesh>
    <gridHelper args={[floorW,Math.max(10,Math.round(floorW*10)),"#465360","#2d3945"]} position={[0,.001,0]} />
    <group position={[plateX,0,0]}><Plate widthMm={widthMm} depthMm={depthMm} /></group>
    <group position={[objectX,0,0]}>{modelUrl ? <Suspense fallback={<SimpleObject spec={spec} />}><GeneratedObject url={modelUrl} spec={spec} /></Suspense> : <SimpleObject spec={spec} />}</group>
    <ContactShadows position={[0,.003,0]} opacity={.4} scale={Math.max(2,totalW+.5)} blur={2} far={2.5} />
    <OrbitControls makeDefault target={[0,Math.max(spec.heightMm/1000,.2)*.46,0]} minDistance={.35} maxDistance={7} enableDamping dampingFactor={.08} maxPolarAngle={Math.PI*.49} />
  </>;
}

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

export default function Home() {
  const [widthMm,setWidthMm] = useState(180), [depthMm,setDepthMm] = useState(180);
  const [printerName,setPrinterName] = useState("");
  const [spec,setSpec] = useState<ObjectSpec>({id:"mug",name:"Coffee mug",widthMm:95,heightMm:100,depthMm:95,note:"Approximate everyday dimensions; individual mugs vary.",prompt:"a simple ceramic coffee mug"});
  const [modelUrl,setModelUrl] = useState<string|null>(null);
  const [searchResults,setSearchResults] = useState<SearchResult[]>([]);
  const [sourceStatus,setSourceStatus] = useState(""), [generateStatus,setGenerateStatus] = useState("");
  const [busySearch,setBusySearch] = useState(false), [busyGenerate,setBusyGenerate] = useState(false);
  const [error,setError] = useState(""), [taskId,setTaskId] = useState<string|null>(null);

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/tripo?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not check Tripo task.");
        if (cancelled) return;
        setGenerateStatus(`Tripo is working: ${data.progress ?? 0}%`);
        if (data.status === "success") {
          const file = await fetch(`/api/tripo?taskId=${encodeURIComponent(taskId)}&download=1`);
          if (!file.ok) { const problem = await file.json().catch(() => ({})); throw new Error(problem.error || "Model download failed."); }
          const url = URL.createObjectURL(await file.blob());
          setModelUrl(old => { if (old) URL.revokeObjectURL(old); return url; });
          setGenerateStatus("Model ready. The displayed object's outer dimensions are fitted to the listed measurements.");
          setTaskId(null); setBusyGenerate(false); return;
        }
        if (["failed","cancelled","banned"].includes(data.status)) throw new Error(data.error || "Tripo could not generate this object.");
        timer = setTimeout(poll,3500);
      } catch (err) {
        if (!cancelled) { setError(err instanceof Error ? err.message : "Tripo request failed."); setBusyGenerate(false); setTaskId(null); }
      }
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  },[taskId]);

  const searchSpecs = async () => {
    if (!printerName.trim()) { setError("Enter the printer name or model first."); return; }
    setBusySearch(true); setError(""); setSearchResults([]); setSourceStatus("Searching Hyperbrowser for build-area specifications…");
    try {
      const res = await fetch("/api/spec-search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({printerName:printerName.trim()})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Specification search failed.");
      setSearchResults(data.results || []);
      setSourceStatus(data.results?.length ? "Check the manufacturer's source before entering dimensions." : "No results. Try the exact printer model name.");
    } catch(err) { setError(err instanceof Error ? err.message : "Specification search failed."); setSourceStatus(""); }
    finally { setBusySearch(false); }
  };

  const generate = async () => {
    setBusyGenerate(true); setError(""); setGenerateStatus("Ori is choosing an object from its comparison list…"); setModelUrl(null);
    try {
      const res = await fetch("/api/tripo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plateWidthMm:widthMm,plateDepthMm:depthMm})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start Tripo generation.");
      setSpec(data.object); setTaskId(data.taskId);
      setGenerateStatus(`Ori picked ${data.object.name}; asking Tripo for a ${data.object.widthMm} × ${data.object.heightMm} × ${data.object.depthMm} mm model…`);
    } catch(err) { setError(err instanceof Error ? err.message : "Tripo generation failed."); setBusyGenerate(false); }
  };
  const updateMm = (value: string,setter:(n:number)=>void) => { const n=Number(value); if(Number.isFinite(n)&&n>=50&&n<=1000) setter(n); };
  const area = useMemo(()=>((widthMm*depthMm)/1_000_000).toFixed(4),[widthMm,depthMm]);

  return <main className="app-shell">
    <header className="topbar"><Link className="brand" href="/" aria-label="Ori Dimension home"><span className="brand-mark">O<span>↗</span></span><span>ORI <b>DIMENSION</b></span></Link><span className="topbar-note"><span className="status-dot" /> REAL-WORLD SCALE VIEWER</span></header>
    <section className="intro"><div className="eyebrow">SIZE, MADE VISIBLE</div><h1>How big is the build plate, <span>really?</span></h1><p>Ori puts a measured 3D build plate beside a familiar object. Both share one real-world scale.</p></section>
    <section className="workspace" aria-label="Build plate size comparison">
      <div className="scene-panel">
        <div className="scene-head"><div><span className="section-kicker">LIVE 3D SCENE</span><h2>Build plate <span className="muted">vs.</span> {spec.name.toLowerCase()}</h2></div><span className="unit-chip">1 scene unit = 1 metre</span></div>
        <div className="scene-view"><Canvas shadows dpr={[1,1.75]} camera={{position:[.72,.65,.9],fov:37,near:.01,far:100}} gl={{antialias:true,powerPreference:"high-performance"}}><Scene widthMm={widthMm} depthMm={depthMm} spec={spec} modelUrl={modelUrl} /></Canvas><div className="scene-hint"><span>↻</span> Drag to rotate <i /> Scroll to zoom</div><div className="scale-legend"><span className="legend-printer" /> BUILD PLATE <span className="legend-reference" /> REAL-WORLD OBJECT</div></div>
        <div className="scene-footer"><span>BUILD PLATE DIMENSIONS</span><span>Object: {spec.widthMm} × {spec.heightMm} × {spec.depthMm} mm</span></div>
      </div>
      <aside className="controls-panel">
        <div className="control-block"><div className="section-kicker">01 / BUILD PLATE</div><h2>Enter verified dimensions</h2><p className="control-copy">Example dimensions until verified for your exact printer.</p>
          <div className="dimension-grid two-fields"><label className="dimension-field"><span>Width <small>mm</small></span><input aria-label="Build plate width in millimetres" type="number" min="50" max="1000" value={widthMm} onChange={e=>updateMm(e.target.value,setWidthMm)} /></label><label className="dimension-field"><span>Depth <small>mm</small></span><input aria-label="Build plate depth in millimetres" type="number" min="50" max="1000" value={depthMm} onChange={e=>updateMm(e.target.value,setDepthMm)} /></label></div>
          <button className="reset-button" onClick={()=>{setWidthMm(180);setDepthMm(180);}}>Reset example (180 × 180 mm)</button>
          <div className="control-divider" />
          <label className="search-label" htmlFor="printer-model">Find your printer&apos;s build plate</label><div className="search-row"><input id="printer-model" value={printerName} onChange={e=>setPrinterName(e.target.value)} placeholder="e.g. Bambu Lab A1 mini" /><button onClick={searchSpecs} disabled={busySearch}>{busySearch?"Searching…":"Search"}</button></div>
          <p className="fine-print">Hyperbrowser searches for specifications. Verify the manufacturer source before using measurements.</p>{sourceStatus&&<p className="inline-status">{sourceStatus}</p>}
          {searchResults.map(r=><a className="source-result" key={r.url} href={r.url} target="_blank" rel="noreferrer"><b>{r.title}</b><span>{r.description}</span><small>Open source ↗</small></a>)}
        </div>
        <div className="control-divider" />
        <div className="control-block"><div className="section-kicker">02 / ORI + TRIPO</div><h2>Generate a comparison</h2><p className="control-copy">Ori chooses a suitable everyday object, then asks Tripo to generate it with real-world measurements in the prompt.</p>
          <div className="selected-object"><div className="object-icon">◇</div><div><b>{spec.name}</b><span>{spec.widthMm} W × {spec.heightMm} H × {spec.depthMm} D mm</span></div></div>
          <button className="primary-button" onClick={generate} disabled={busyGenerate}>{busyGenerate?"Generating model…":"Generate with Tripo"}</button>{generateStatus&&<p className="inline-status">{generateStatus}</p>}
          <p className="fine-print">Generation may use API credits. Listed measurements control the displayed object&apos;s outer dimensions.</p>
        </div>
        <div className="control-divider" />
        <div className="control-block summary-block"><div className="section-kicker">03 / QUICK READ</div><div className="summary-row"><span>Plate width</span><b>{fmt(widthMm)} mm</b></div><div className="summary-row"><span>Plate depth</span><b>{fmt(depthMm)} mm</b></div><div className="summary-row"><span>Plate area</span><b>{area} m²</b></div><div className="summary-row"><span>Object height</span><b>{fmt(spec.heightMm)} mm</b></div><p className="fine-print">The build plate and comparison object share one scale. The 180 × 180 mm starting size is an example, not a printer-specific claim.</p></div>
        {error&&<div className="error-message" role="alert">{error}</div>}
      </aside>
    </section>
    <footer className="page-footer"><span>ORI DIMENSION <i>·</i> BUILT FOR REAL-WORLD SCALE</span><span>Dimensions, not AI guesses, define the scale.</span></footer>
  </main>;
}
