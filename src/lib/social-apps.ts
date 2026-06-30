// Apps de rede social/distração monitorados (pacotes Android).
export interface AppMonitorado {
  pkg: string;
  nome: string;
  icone: string;
}

// WhatsApp ficou de fora de propósito: é ferramenta de resolução do dia a dia,
// não doomscroll. Não entra na janela de rede nem no limitador por padrão.
export const APPS_SOCIAIS: AppMonitorado[] = [
  { pkg: "com.instagram.android", nome: "Instagram", icone: "📸" },
  { pkg: "com.instagram.barcelona", nome: "Threads", icone: "🧵" },
  { pkg: "com.zhiliaoapp.musically", nome: "TikTok", icone: "🎵" },
  { pkg: "com.twitter.android", nome: "X / Twitter", icone: "🐦" },
  { pkg: "com.facebook.katana", nome: "Facebook", icone: "👍" },
];

// Limite saudável da "janela única" do plano (30–40 min).
export const LIMITE_REDE_MIN = 40;

export function nomeApp(pkg: string): AppMonitorado | undefined {
  return APPS_SOCIAIS.find((a) => a.pkg === pkg);
}
