// Apps de rede social/distração monitorados (pacotes Android).
export interface AppMonitorado {
  pkg: string;
  nome: string;
}

// WhatsApp ficou de fora de propósito: é ferramenta de resolução do dia a dia,
// não doomscroll. Não entra na janela de rede nem no limitador por padrão.
export const APPS_SOCIAIS: AppMonitorado[] = [
  { pkg: "com.instagram.android", nome: "Instagram" },
  { pkg: "com.instagram.barcelona", nome: "Threads" },
  { pkg: "com.zhiliaoapp.musically", nome: "TikTok" },
  { pkg: "com.twitter.android", nome: "X / Twitter" },
  { pkg: "com.facebook.katana", nome: "Facebook" },
];

// Limite saudável da "janela única" do plano (30–40 min).
export const LIMITE_REDE_MIN = 40;

export function nomeApp(pkg: string): AppMonitorado | undefined {
  return APPS_SOCIAIS.find((a) => a.pkg === pkg);
}
