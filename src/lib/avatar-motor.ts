// Motor de evolução/estilização do avatar.
// A partir de UM modelo riggado (Avaturn → esqueleto Mixamo), gera as variações
// magro→forte por software, escalando ossos específicos (girth), e aplica um
// "estilo" de material (brilho/emissivo/metal). Tudo guiado por config, então
// novos visuais futuros são só dados — sem precisar exportar outro .glb.

import * as THREE from "three";

// Escala LOCAL (x/z) de cada osso na intensidade máxima. Foi calculada a partir
// de espessuras-alvo no "mundo" (ex.: tronco +26%, braço +40%, coxa +28%) já
// divididas pela espessura do osso-pai, porque escalar um osso propaga aos
// filhos. Por isso pescoço/mãos/pés ficam < 1: compensam o engrossamento herdado
// do tronco/braço/perna para a cabeça, mãos e pés NÃO incharem. Mantém o
// comprimento (y) intacto — só engrossa. Rig padrão do Avaturn (Mixamo).
const OSSO_ESCALA: Record<string, number> = {
  Hips: 1.05,
  Spine: 1.067,
  Spine1: 1.071,
  Spine2: 1.05, // peito/dorsal
  Neck: 0.794, // compensa o tronco → cabeça normal
  LeftShoulder: 1.032,
  RightShoulder: 1.032,
  LeftArm: 1.077,
  RightArm: 1.077, // bíceps/tríceps
  LeftForeArm: 0.871,
  RightForeArm: 0.871, // antebraço (alvo de mundo +22%)
  LeftHand: 0.82,
  RightHand: 0.82, // compensa o braço → mão normal
  LeftUpLeg: 1.219,
  RightUpLeg: 1.219, // quadríceps
  LeftLeg: 0.906,
  RightLeg: 0.906, // panturrilha (alvo de mundo +16%)
  LeftFoot: 0.862,
  RightFoot: 0.862, // compensa a perna → pé normal
};

// Aplica a musculatura ao esqueleto. Idempotente: define a escala absoluta, então
// pode ser chamado de novo quando a intensidade muda. `intensidade` 0..1 (do rank);
// interpola cada osso entre a base (1) e o alvo.
export function aplicarFisico(raiz: THREE.Object3D, intensidade: number): void {
  const t = Math.max(0, Math.min(intensidade, 1));
  raiz.traverse((o) => {
    const alvo = OSSO_ESCALA[o.name];
    if (alvo == null) return;
    const s = 1 + (alvo - 1) * t;
    o.scale.set(s, 1, s); // engrossa em x/z, comprimento (y) preservado
  });
}

// Estilo de material — a camada de "estilização" (temas futuros são só novos
// presets). Mexe no emissivo/metal/brilho sem destruir a textura original.
export interface EstiloAvatar {
  emissive?: string; // cor do brilho interno (ex.: cor do rank)
  emissiveIntensidade?: number;
  metalness?: number;
  roughness?: number;
}

// Guarda os valores originais de cada material na 1ª passagem, para que reaplicar
// um estilo diferente não acumule (parta sempre da base).
const ORIGINAIS = new WeakMap<
  THREE.Material,
  { emissive: THREE.Color; emissiveIntensity: number; metalness?: number; roughness?: number }
>();

export function aplicarEstilo(raiz: THREE.Object3D, estilo: EstiloAvatar): void {
  raiz.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat || !("emissive" in mat)) continue;

      if (!ORIGINAIS.has(mat)) {
        ORIGINAIS.set(mat, {
          emissive: mat.emissive.clone(),
          emissiveIntensity: mat.emissiveIntensity ?? 1,
          metalness: mat.metalness,
          roughness: mat.roughness,
        });
      }
      const base = ORIGINAIS.get(mat)!;

      if (estilo.emissive) {
        mat.emissive.set(estilo.emissive);
        mat.emissiveIntensity = estilo.emissiveIntensidade ?? 0.4;
      } else {
        mat.emissive.copy(base.emissive);
        mat.emissiveIntensity = base.emissiveIntensity;
      }
      mat.metalness = estilo.metalness ?? base.metalness ?? mat.metalness;
      mat.roughness = estilo.roughness ?? base.roughness ?? mat.roughness;
      mat.needsUpdate = true;
    }
  });
}

// Deriva o estilo do rank. Por enquanto NÃO pinta o corpo: o avatar deve manter
// a cor natural em todos os ranks (a evolução vem da musculatura + aura da cena).
// Devolve um estilo vazio (restaura o material base). Mantido como gancho pra
// estilizações/temas futuros — é só preencher os campos aqui.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function estiloDoRank(rankIndex: number, cor: string): EstiloAvatar {
  return {};
}
