"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, ContactShadows, OrbitControls, Sparkles } from "@react-three/drei";
import type { Group } from "three";
import { SkeletonUtils } from "three-stdlib";
import { aplicarFisico, aplicarEstilo, estiloDoRank } from "@/lib/avatar-motor";

function Modelo({
  url,
  escala,
  intensidadeFisico,
  rankIndex,
  cor,
}: {
  url: string;
  escala: number;
  intensidadeFisico: number;
  rankIndex: number;
  cor: string;
}) {
  const ref = useRef<Group>(null);
  const { scene, animations } = useGLTF(url);
  // Clona preservando o esqueleto: o motor escala ossos no clone, sem mexer no
  // modelo cacheado (que é compartilhado entre instâncias).
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, ref);

  useEffect(() => {
    const primeira = Object.values(actions)[0];
    primeira?.reset().fadeIn(0.4).play();
    return () => {
      primeira?.fadeOut(0.2);
    };
  }, [actions]);

  // Motor de evolução: musculatura (escala de ossos) + estilo (material) por rank.
  useEffect(() => {
    aplicarFisico(clone, intensidadeFisico);
    aplicarEstilo(clone, estiloDoRank(rankIndex, cor));
  }, [clone, intensidadeFisico, rankIndex, cor]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25;
  });

  return (
    <group ref={ref} scale={escala}>
      <primitive object={clone} />
    </group>
  );
}

export function Avatar3D({
  url,
  streak,
  cor = "#a855f7",
  rankIndex = 0,
}: {
  url: string;
  streak: number;
  cor?: string;
  rankIndex?: number; // 0 (E) .. 6 (Monarca) — comanda a evolução visual
}) {
  // Nível de poder: o rank é o motor da evolução; o streak dá um empurrão extra.
  const fatorRank = Math.min(Math.max(rankIndex, 0) / 6, 1);
  const fatorStreak = Math.min(streak / 30, 1);
  const fator = Math.min(Math.max(fatorRank, fatorStreak * 0.85), 1);
  // Luz colorida do rank fica suave (só um realce de borda) pra não pintar a pele
  // de azul/rosa; quem ilumina o corpo é a luz branca neutra abaixo.
  const auraLuz = 0.25 + fator * 0.8;
  const escala = 1 + fatorRank * 0.05; // cresce pouco, pra não estourar a moldura

  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      gl={{ alpha: true }}
      camera={{ position: [0, 1.0, 3.7], fov: 35 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      {/* luz branca neutra domina → pele com cor natural */}
      <ambientLight intensity={1.15} />
      <hemisphereLight intensity={0.7} groundColor="#1a1d27" />
      <directionalLight position={[3, 6, 4]} intensity={1.7} castShadow />
      <directionalLight position={[-4, 3, -2]} intensity={0.6} />
      {/* realce de borda neutro (branco) — não pinta o corpo de cor */}
      <pointLight position={[-2, 1.6, -2.2]} intensity={auraLuz} distance={9} />
      <pointLight position={[2, 1.6, -2.2]} intensity={auraLuz * 0.7} distance={9} />

      <Suspense fallback={null}>
        <Modelo
          url={url}
          escala={escala}
          intensidadeFisico={fatorRank}
          rankIndex={rankIndex}
          cor={cor}
        />
        <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={5} blur={2.5} far={3} />
        {/* partículas de poder — brancas pra ficarem visíveis em qualquer rank
            (antes usavam a cor do rank e sumiam no fundo da mesma cor) */}
        <Sparkles
          count={Math.round(24 + fator * 80)}
          scale={[2.2, 3.4, 2.2]}
          position={[0, 1.4, 0]}
          size={4 + fator * 3}
          speed={0.4}
          color="#ffffff"
        />
      </Suspense>

      {/* anel de aura no chão */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.62, 0.9, 64]} />
        <meshBasicMaterial color={cor} transparent opacity={0.3 + fator * 0.5} />
      </mesh>

      <OrbitControls
        enablePan={false}
        minDistance={2.4}
        maxDistance={5}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.9}
        target={[0, 0.95, 0]}
      />
    </Canvas>
  );
}
