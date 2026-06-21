// Apps de rede social/distração monitorados (pacotes Android).
export interface AppMonitorado {
  pkg: string;
  nome: string;
  icone: string;
}

export const APPS_SOCIAIS: AppMonitorado[] = [
  { pkg: "com.instagram.android", nome: "Instagram", icone: "📸" },
  { pkg: "com.whatsapp", nome: "WhatsApp", icone: "💬" },
  { pkg: "com.zhiliaoapp.musically", nome: "TikTok", icone: "🎵" },
  { pkg: "com.google.android.youtube", nome: "YouTube", icone: "▶️" },
  { pkg: "com.twitter.android", nome: "X / Twitter", icone: "🐦" },
  { pkg: "com.facebook.katana", nome: "Facebook", icone: "👍" },
];

// Limite saudável da "janela única" do plano (30–40 min).
export const LIMITE_REDE_MIN = 40;

export function nomeApp(pkg: string): AppMonitorado | undefined {
  return APPS_SOCIAIS.find((a) => a.pkg === pkg);
}
