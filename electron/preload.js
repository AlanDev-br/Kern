// Ponte entre o processo principal e a página, com `contextIsolation` ligado.
//
// A página não ganha acesso ao Node: ela recebe exatamente três funções, e
// nenhuma delas aceita caminho de arquivo, comando ou qualquer coisa que possa
// virar execução. É o mínimo para a sincronia funcionar, e nada além.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kernDesktop", {
  /** Marca de que estamos dentro do executável, e não no navegador. */
  presente: true,

  /** Endereço na rede local e código de pareamento, para a tela mostrar. */
  async dadosDeRede() {
    return ipcRenderer.invoke("kern:rede");
  },

  /**
   * Assina o recebimento de um instantâneo vindo do celular. Devolve a função
   * que cancela — sem ela, uma tela remontada acumularia ouvintes e aplicaria o
   * mesmo instantâneo várias vezes.
   */
  aoReceberInstantaneo(callback) {
    const ouvinte = (_evento, instantaneo) => callback(instantaneo);
    ipcRenderer.on("kern:instantaneo", ouvinte);
    return () => ipcRenderer.removeListener("kern:instantaneo", ouvinte);
  },
});
