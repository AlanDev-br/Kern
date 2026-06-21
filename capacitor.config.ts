import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.alan.kern",
  appName: "Kern",
  // Next.js com output:'export' gera a pasta /out.
  webDir: "out",
  android: {
    // Fundo da splash/WebView combinando com o tema dark do app.
    backgroundColor: "#0a0b0f",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#22c55e",
    },
  },
};

export default config;
