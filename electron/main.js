// Casca de desktop do Kern.
//
// O app e o mesmo export estatico que roda na web e dentro do Capacitor: nada
// aqui reimplementa tela, dado ou logica. Esta casca so resolve tres coisas que
// o navegador resolvia de graca — de onde vem o arquivo, qual e a origem, e o
// tamanho da janela.
//
// ── Por que protocolo proprio, e nao file:// nem localhost ──
//
// `file://` quebra o roteamento: o Next usa a History API, e caminho de arquivo
// nao tem raiz de site. Cai em pagina em branco na segunda rota.
//
// `http://localhost:<porta>` funciona, mas tem um defeito que so aparece
// depois: a porta entra na ORIGEM, e o IndexedDB e por origem. Subir numa porta
// livre qualquer significa origem nova a cada abertura, e o app abriria vazio,
// com todo o historico intacto e inalcancavel num banco orfao. Porta fixa
// resolveria ate o dia em que outro programa pegasse a porta primeiro.
//
// Um esquema proprio registrado como padrao tem origem estavel por construcao:
// `kern://app` hoje, amanha e depois de reinstalar. E dai que vem a promessa de
// que o dado continua ali.

const { app, BrowserWindow, protocol, net, shell, ipcMain } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const { iniciarServidor } = require("./servidor");

// A pasta do export do Next. Empacotado, `out/` vai junto no asar.
const RAIZ = path.join(__dirname, "..", "out");
const ORIGEM = "kern://app";

// ── Renderização por software ──
//
// O app monta um avatar 3D em WebGL (three.js). Nesta máquina o processo de
// GPU do Chromium morre com violação de acesso assim que o shader sobe, nove
// vezes seguidas, até o Chromium desistir: "GPU process isn't usable. Goodbye."
// O renderizador cai junto e a janela fecha sozinha — que é como o defeito
// aparece para quem só clicou no atalho.
//
// A troca aceita aqui: WebGL por software é mais lento, e o avatar gira menos
// fluido. Mas um avatar lento é melhor que um app que não abre, e desligar a
// aceleração é a única correção que não depende do driver de vídeo do usuário.
//
// `enable-unsafe-swiftshader` é o que permite o WebGL cair para software em vez
// de simplesmente não existir — sem ele o avatar ficaria preto num app que abre.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("enable-unsafe-swiftshader");

// `standard` faz o esquema ter origem e caminho de verdade (sem isso o
// IndexedDB e o localStorage nao existem). `secure` o coloca em contexto
// seguro, que e requisito de boa parte das APIs modernas.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "kern",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

/** Traduz um caminho de URL para o arquivo correspondente dentro de `out/`. */
function resolverArquivo(pathname) {
  let rel = decodeURIComponent(pathname);
  // `trailingSlash: true` no next.config: /treino/ mora em out/treino/index.html
  if (rel.endsWith("/")) rel += "index.html";
  if (!path.extname(rel)) rel += "/index.html";

  const destino = path.join(RAIZ, rel);

  // Nada fora de `out/`. Um `..` no caminho nao pode virar leitura de disco.
  const dentro = path.relative(RAIZ, destino);
  if (dentro.startsWith("..") || path.isAbsolute(dentro)) return null;
  return destino;
}

function criarJanela() {
  const janela = new BrowserWindow({
    width: 1440,
    height: 900,
    // 1024 e o ponto em que o layout vira painel de colunas com navegacao
    // lateral. Abaixo disso o app volta ao desenho de celular, que funciona mas
    // nao e o motivo de existir uma janela.
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#08090d", // mesmo --bg: evita o flash branco na abertura
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Só mostra quando ha o que mostrar, em vez de uma janela vazia piscando.
  janela.once("ready-to-show", () => janela.show());

  // Link externo abre no navegador do sistema. O WhatsApp e o console da Groq
  // nao tem por que virar uma janela do Kern sem barra de endereco.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith("kern://")) shell.openExternal(url);
    return { action: "deny" };
  });

  janela.loadURL(`${ORIGEM}/`);
  return janela;
}

// Uma instancia so. Duas janelas sobre o mesmo IndexedDB dariam leitura suja e
// gravacao perdida — os dois lados acham que sao donos do estado.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [janela] = BrowserWindow.getAllWindows();
    if (janela) {
      if (janela.isMinimized()) janela.restore();
      janela.focus();
    }
  });

  app.whenReady().then(() => {
    protocol.handle("kern", async (req) => {
      const arquivo = resolverArquivo(new URL(req.url).pathname);
      if (!arquivo) return new Response("", { status: 403 });
      try {
        return await net.fetch(pathToFileURL(arquivo).toString());
      } catch {
        // Rota inexistente cai na 404 do proprio Next, com a cara do app.
        const erro = path.join(RAIZ, "404.html");
        try {
          const r = await net.fetch(pathToFileURL(erro).toString());
          return new Response(await r.arrayBuffer(), {
            status: 404,
            headers: { "content-type": "text/html" },
          });
        } catch {
          return new Response("", { status: 404 });
        }
      }
    });

    criarJanela();

    // Ponto de recepção da sincronia. Sobe junto com a janela e vive enquanto
    // o app estiver aberto: é isso que faz "abrir o Kern no computador" ser o
    // gesto que habilita receber do celular, sem serviço em segundo plano nem
    // nada rodando quando o app está fechado.
    const rede = iniciarServidor({
      aoReceber: (instantaneo) => {
        // O processo principal não fala com o IndexedDB — ele é da página. O
        // instantâneo atravessa por IPC e quem grava é o app, com o mesmo
        // código que grava qualquer outra coisa.
        for (const j of BrowserWindow.getAllWindows()) {
          j.webContents.send("kern:instantaneo", instantaneo);
        }
      },
      aoLog: (msg) => console.log("[sincronia]", msg),
    });

    ipcMain.handle("kern:rede", () => ({
      codigo: rede.codigo,
      porta: rede.porta,
      enderecos: rede.enderecos,
    }));

    app.on("before-quit", () => rede.parar());

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) criarJanela();
    });
  });

  // No Windows e no Linux, fechar a janela e fechar o app.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
