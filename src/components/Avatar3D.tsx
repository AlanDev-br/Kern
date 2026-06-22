"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, ContactShadows, OrbitControls } from "@react-three/drei";
import type { Group } from "three";

function corAccent(): string {
  if (typeof document === "undefined") return "#22c55e";
  return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#22c55e";
}

function Modelo({ url }: { url: string }) {
  const ref = useRef<Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, ref);

  useEffect(() => {
    const primeira = Object.values(actions)[0];
    primeira?.reset().fadeIn(0.4).play();
    return () => {
      primeira?.fadeOut(0.2);
    };
  }, [actions]);

  // auto-rotação leve
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25;
  });

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
}

export function Avatar3D({ url, streak }: { url: string; streak: number }) {
  const [accent, setAccent] = useState("#22c55e");
  useEffect(() => setAccent(corAccent()), []);

  const fator = Math.min(streak / 30, 1); // 0..1 conforme o streak
  const intensidade = 0.4 + fator * 1.6;

  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [0, 0.95, 3.1], fov: 35 }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#08090d"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
      {/* luz de recorte = aura na cor do tema, mais forte quanto maior o streak */}
      <pointLight position={[-2, 1.5, -1.5]} color={accent} intensity={intensidade} distance={8} />
      <pointLight position={[0, 1, 2]} color={accent} intensity={intensidade * 0.5} distance={6} />

      <Suspense fallback={null}>
        <Modelo url={url} />
        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={5} blur={2.5} far={3} />
      </Suspense>

      {/* anel de aura no chão */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.65, 0.85, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.25 + fator * 0.5} />
      </mesh>

      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={4.5}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.9}
        target={[0, 0.9, 0]}
      />
    </Canvas>
  );
}
