"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, ContactShadows, OrbitControls, Sparkles } from "@react-three/drei";
import type { Group } from "three";

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

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25;
  });

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
}

export function Avatar3D({
  url,
  streak,
  cor = "#a855f7",
}: {
  url: string;
  streak: number;
  cor?: string;
}) {
  const fator = Math.min(streak / 30, 1);
  const intensidade = 0.6 + fator * 1.8;

  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      gl={{ alpha: true }}
      camera={{ position: [0, 0.95, 3.1], fov: 35 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      {/* luz ambiente forte pra não ficar escuro */}
      <ambientLight intensity={1.1} />
      <hemisphereLight intensity={0.7} groundColor="#1a1d27" />
      <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 3, -2]} intensity={0.6} />
      {/* aura na cor do rank, mais forte com o streak */}
      <pointLight position={[-2, 1.6, -1.5]} color={cor} intensity={intensidade} distance={9} />
      <pointLight position={[0, 1, 2]} color={cor} intensity={intensidade * 0.6} distance={7} />

      <Suspense fallback={null}>
        <Modelo url={url} />
        <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={5} blur={2.5} far={3} />
        {/* partículas de poder (Solo Leveling) — quantidade cresce com o streak */}
        <Sparkles
          count={Math.round(20 + fator * 60)}
          scale={[2.2, 3.4, 2.2]}
          position={[0, 1.4, 0]}
          size={4}
          speed={0.4}
          color={cor}
        />
      </Suspense>

      {/* anel de aura no chão */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.62, 0.9, 64]} />
        <meshBasicMaterial color={cor} transparent opacity={0.3 + fator * 0.5} />
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
