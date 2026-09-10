// Ponto de recepção na rede local.
//
// O sentido é um só: o celular envia, o desktop recebe. Isso não é limitação
// técnica, é o desenho — o celular é onde o dia acontece, e o desktop é
// espelho. Espelho que discute com a fonte deixa de ser espelho.
//
// Quem faz a requisição é o celular, e não o contrário, por um motivo prático
// além desse: o app Android é WebView do Capacitor. Ele faz requisição de saída
// sem esforço, mas para SERVIR precisaria de plugin nativo. Com o desktop
// escutando, nenhum código nativo novo precisa existir.

const http = require("http");
const os = require("os");

const PORTA = 8787;

/** Endereços IPv4 desta máquina na rede local, para a tela poder mostrar. */
function enderecosLocais() {
  const saida = [];
  for (const [nome, lista] of Object.entries(os.networkInterfaces())) {
    for (const i of lista ?? []) {
      // Só IPv4 externo: descarta loopback e as interfaces virtuais do Docker
      // e das VPNs, que aparecem aqui e não levam ao celular.
      if (i.family !== "IPv4" || i.internal) continue;
      if (/^(172\.1[7-9]\.|172\.2\d\.|172\.3[01]\.)/.test(i.address)) continue;
      saida.push({ nome, endereco: i.address });
    }
  }
  return saida;
}

/**
 * Código de pareamento. Um servidor aberto no Wi-Fi que aceita substituir o
 * banco inteiro é risco real: qualquer aparelho na mesma rede poderia mandar
 * lixo. O código é um segredo compartilhado simples — não é criptografia, e não
 * finge ser: protege contra o vizinho e contra engano, não contra ataque.
 *
 * Nasce a cada abertura do app, de propósito: um código que não expira vira
 * senha permanente escrita na tela.
 */
function novoCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function iniciarServidor({ aoReceber, aoLog }) {
  const codigo = novoCodigo();

  const servidor = http.createServer((req, res) => {
    // O celular chega de outra origem; sem isto o navegador do WebView barra.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-kern-codigo");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    // Aperto de mão: o celular confirma que achou o Kern, e não outro programa
    // que por acaso escuta nesta porta.
    if (req.method === "GET" && url.pathname === "/kern/ola") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ app: "kern", papel: "desktop", maquina: os.hostname() }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/kern/instantaneo") {
      if (req.headers["x-kern-codigo"] !== codigo) {
        aoLog?.("recusado: código não confere");
        res.writeHead(403, { "content-type": "application/json" });
        res.end(JSON.stringify({ erro: "codigo-invalido" }));
        return;
      }

      // Teto de tamanho: sem ele, um envio grande demais (ou malicioso) enche a
      // memória do processo principal antes de qualquer validação.
      const LIMITE = 64 * 1024 * 1024;
      let bruto = "";
      let excedeu = false;
      req.on("data", (parte) => {
        if (excedeu) return;
        bruto += parte;
        if (bruto.length > LIMITE) {
          excedeu = true;
          res.writeHead(413, { "content-type": "application/json" });
          res.end(JSON.stringify({ erro: "grande-demais" }));
          req.destroy();
        }
      });
      req.on("end", () => {
        if (excedeu) return;
        try {
          const inst = JSON.parse(bruto);
          if (!inst || typeof inst !== "object" || !inst.tabelas) throw new Error("formato");
          aoReceber(inst);
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
          aoLog?.("instantâneo recebido");
        } catch {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ erro: "json-invalido" }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  servidor.on("error", (e) => aoLog?.("servidor: " + e.message));
  servidor.listen(PORTA, "0.0.0.0");

  return {
    codigo,
    porta: PORTA,
    enderecos: enderecosLocais(),
    parar: () => servidor.close(),
  };
}

module.exports = { iniciarServidor, enderecosLocais, PORTA };
