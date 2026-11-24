"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { FOCUS_EVENT, type FocusDetail } from "@/components/chat/record-chat";

type Props = { sectionIds: string[]; archiveCount: number };

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aGlow;
  uniform float uPixelRatio;
  varying float vGlow;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (9.0 / -mv.z) * (1.0 + aGlow * 1.6);
    vGlow = aGlow;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float alpha = pow(core, 1.6) * (uOpacity + vGlow * 0.6);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vec3(0.95, 0.96, 0.95), alpha);
  }
`;

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export default function RecordScene({ sectionIds, archiveCount }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const idsKey = sectionIds.join("|");

  useEffect(() => {
    const element = host.current;
    const ids = idsKey.split("|");
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return;
    }
    const ratio = Math.min(window.devicePixelRatio, 1.75);
    renderer.setPixelRatio(ratio);
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const rig = new THREE.Group();
    const sphere = new THREE.Group();
    rig.add(sphere);
    scene.add(rig);
    sphere.rotation.x = 0.38;
    sphere.rotation.z = -0.12;

    const random = seeded(1812);
    const named = ids.length;
    const total = named + archiveCount;
    const positions = new Float32Array(total * 3);
    const sizes = new Float32Array(total);
    const glow = new Float32Array(total);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const order = Array.from({ length: total }, (_, i) => i).sort(() => random() - 0.5);
    for (let k = 0; k < total; k += 1) {
      const i = order[k];
      const y = 1 - (k / (total - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * k;
      const radius = (i < named ? 2.55 : 2.2 + random() * 0.9) * (0.96 + random() * 0.08);
      positions[i * 3] = Math.cos(theta) * r * radius;
      positions[i * 3 + 1] = y * radius;
      positions[i * 3 + 2] = Math.sin(theta) * r * radius;
      sizes[i] = i < named ? 7 : 3.2 + random() * 1.8;
    }
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    nodeGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    const glowAttribute = new THREE.BufferAttribute(glow, 1);
    nodeGeometry.setAttribute("aGlow", glowAttribute);
    const nodeMaterial = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uPixelRatio: { value: ratio }, uOpacity: { value: 0.95 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    sphere.add(new THREE.Points(nodeGeometry, nodeMaterial));

    const edges: number[] = [];
    for (let i = 0; i < total; i += 1) {
      const near: { j: number; d: number }[] = [];
      for (let j = 0; j < total; j += 1) {
        if (i === j) continue;
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        near.push({ j, d: dx * dx + dy * dy + dz * dz });
      }
      near.sort((a, b) => a.d - b.d);
      for (const { j } of near.slice(0, 2)) {
        if (j < i) continue;
        edges.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2], positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
      }
    }
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edges, 3));
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, depthWrite: false });
    sphere.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

    const core = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.85, 1)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false }),
    );
    sphere.add(core);

    const ringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false });
    const rings: THREE.Line[] = [];
    [
      [3.15, 0, 0],
      [3.35, Math.PI / 2.4, 0.3],
      [2.95, Math.PI / 1.7, -0.6],
    ].forEach(([radius, tiltX, tiltY]) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
      const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(200)), ringMaterial);
      ring.rotation.set(Math.PI / 2 + tiltX, tiltY, 0);
      rings.push(ring);
      sphere.add(ring);
    });

    const dustCount = 900;
    const dust = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount).fill(1.4);
    for (let i = 0; i < dustCount; i += 1) {
      const radius = 6 + random() * 14;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      dust[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      dust[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      dust[i * 3 + 2] = radius * Math.cos(phi) - 6;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    dustGeometry.setAttribute("aSize", new THREE.BufferAttribute(dustSizes, 1));
    dustGeometry.setAttribute("aGlow", new THREE.BufferAttribute(new Float32Array(dustCount), 1));
    const dustMaterial = nodeMaterial.clone();
    dustMaterial.uniforms.uOpacity.value = 0.45;
    const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustPoints);

    const beamGeometry = new THREE.BufferGeometry();
    beamGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(18), 3));
    const beamMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    const beams = new THREE.LineSegments(beamGeometry, beamMaterial);
    sphere.add(beams);

    const indexOf = new Map(ids.map((id, i) => [id, i]));
    const target = new Float32Array(total);
    let busy = false;
    let beamTarget = 0;

    const onFocus = (event: Event) => {
      const detail = (event as CustomEvent<FocusDetail>).detail;
      busy = detail.busy;
      target.fill(0);
      const hits = detail.ids.map((id) => indexOf.get(id) ?? Math.floor(hash(id) * named)).slice(0, 3);
      const beam = beamGeometry.getAttribute("position") as THREE.BufferAttribute;
      beam.array.fill(0);
      hits.forEach((i, n) => {
        target[i] = 1;
        beam.setXYZ(n * 2 + 1, positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      });
      beam.needsUpdate = true;
      beamTarget = hits.length > 0 ? 0.6 : 0;
      if (reduced) render(0);
    };
    window.addEventListener(FOCUS_EVENT, onFocus);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (event: PointerEvent) => {
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = element;
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = `${width}px`;
      renderer.domElement.style.height = `${height}px`;
      camera.aspect = width / height;
      const wide = camera.aspect > 1.15;
      rig.position.set(wide ? 2.35 : 1.5, wide ? 0.15 : 2.6, 0);
      rig.scale.setScalar(wide ? 1 : 0.72);
      nodeMaterial.uniforms.uOpacity.value = wide ? 0.95 : 0.5;
      edgeMaterial.opacity = wide ? 0.13 : 0.07;
      camera.updateProjectionMatrix();
      if (reduced) render(0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);

    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibility.observe(element);

    const clock = new THREE.Clock();
    let spin = 0;
    function render(delta: number) {
      for (let i = 0; i < total; i += 1) glow[i] += (target[i] - glow[i]) * Math.min(1, delta * 4 || 1);
      glowAttribute.needsUpdate = true;
      beamMaterial.opacity += (beamTarget - beamMaterial.opacity) * Math.min(1, delta * 3 || 1);
      renderer.render(scene, camera);
    }

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const delta = Math.min(clock.getDelta(), 0.05);
      if (!visible || document.hidden) return;
      const speed = busy ? 0.42 : 0.06;
      spin += delta * speed;
      sphere.rotation.y = spin;
      core.rotation.y = -spin * 2.2;
      core.rotation.x = spin * 0.8;
      rings[0].rotation.z += delta * (busy ? 0.6 : 0.05);
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      rig.rotation.y = pointer.x * 0.18;
      rig.rotation.x = pointer.y * 0.1;
      dustPoints.rotation.y = spin * 0.15;
      render(delta);
    };

    resize();
    if (reduced) render(0);
    else loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      window.removeEventListener(FOCUS_EVENT, onFocus);
      window.removeEventListener("pointermove", onPointer);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | undefined;
        material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [idsKey, archiveCount]);

  return <div ref={host} className="absolute inset-0" />;
}
