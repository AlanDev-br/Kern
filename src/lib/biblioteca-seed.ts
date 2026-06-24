"use client";

import { db, type CartaoLeitura } from "./db";
import { hojeChave } from "./dates";

// Conceitos curados de bons livros, distilados em português com minhas próprias
// palavras (não são trechos verbatim das obras). Cada um traz a ideia central, a
// aplicação prática no dia a dia e uma pergunta para a revisão espaçada. As
// citações são curtas e atribuídas, apenas como âncora de memória.
//
// Prioridade do conteúdo: as dificuldades reais do Alan — impulsividade e ser
// controlado pelas emoções. Por isso o peso maior em Goleman (emoção/regulação)
// e Peterson (responsabilidade/ordem pessoal).

type ConceitoSeed = Omit<
  CartaoLeitura,
  "caixa" | "proximaRevisao" | "ultimaRevisao" | "revisoes" | "lido" | "criadoEm" | "origem"
>;

export const CONCEITOS_SEED: ConceitoSeed[] = [
  // ── Inteligência Emocional — Daniel Goleman ──────────────────────────────
  {
    id: "ie-sequestro-amigdala",
    livro: "Inteligência Emocional",
    autor: "Daniel Goleman",
    tema: "Sequestro emocional",
    dificuldade: "impulsividade",
    titulo: "O sequestro da amígdala",
    ideia:
      "Diante de uma ameaça, a amígdala dispara uma reação antes que a parte racional do cérebro avalie a situação. Por alguns segundos a emoção 'sequestra' o comando e você age no impulso — para só depois entender o que fez. Saber que esse atraso fisiológico existe é o primeiro passo para não ser refém dele.",
    citacao: "Em certos momentos a emoção age mais rápido que o pensamento. — Goleman",
    aplicacao:
      "Quando sentir o estopim (calor no rosto, mandíbula travada), reconheça em voz baixa: 'isso é a amígdala'. Só nomear já devolve uma fração do controle ao córtex.",
    pergunta: "O que é o sequestro da amígdala e por que ele te faz agir antes de pensar?",
  },
  {
    id: "ie-janela-resposta",
    livro: "Inteligência Emocional",
    autor: "Daniel Goleman",
    tema: "Estímulo e resposta",
    dificuldade: "impulsividade",
    titulo: "A janela entre estímulo e resposta",
    ideia:
      "Entre o que acontece e como você reage existe um espaço — pequeno, mas real. A impulsividade fecha essa janela; a inteligência emocional a alarga. Quanto mais você treina a pausa, mais a resposta vira escolha em vez de reflexo.",
    citacao: "Entre o estímulo e a resposta há um espaço; nesse espaço está a liberdade.",
    aplicacao:
      "Adote a regra dos 6 segundos: ao sentir vontade de reagir (responder, comprar, mandar a mensagem), conte até 6 respirando antes de qualquer ação.",
    pergunta: "Onde mora a sua liberdade de escolha numa reação emocional?",
  },
  {
    id: "ie-autoconsciencia",
    livro: "Inteligência Emocional",
    autor: "Daniel Goleman",
    tema: "Autoconsciência",
    dificuldade: "controle emocional",
    titulo: "Perceber a emoção enquanto ela acontece",
    ideia:
      "A base de toda inteligência emocional é a autoconsciência: notar o que você está sentindo no momento em que sente, não horas depois. Emoção percebida pode ser conduzida; emoção ignorada conduz você.",
    citacao: "Conhecer as próprias emoções é a pedra fundamental. — Goleman",
    aplicacao:
      "Três vezes ao dia, pare 10 segundos e responda: 'o que estou sentindo agora e onde sinto isso no corpo?'.",
    pergunta: "Por que perceber a emoção em tempo real é a base de tudo?",
  },
  {
    id: "ie-nomear-emocao",
    livro: "Inteligência Emocional",
    autor: "Daniel Goleman",
    tema: "Regulação",
    dificuldade: "controle emocional",
    titulo: "Nomear para domar",
    ideia:
      "Dar um nome preciso ao que se sente ('estou frustrado', 'estou com medo de parecer incompetente') reduz a intensidade da emoção. A linguagem traz a experiência para a parte pensante do cérebro, onde ela pode ser trabalhada.",
    citacao: "Nomear a emoção é começar a governá-la.",
    aplicacao:
      "No auge de uma emoção forte, troque 'eu sou' por 'eu estou': não 'sou um fracasso', e sim 'estou sentindo frustração agora'.",
    pergunta: "Qual o efeito de colocar um nome exato na emoção que você sente?",
  },
  {
    id: "ie-adiar-gratificacao",
    livro: "Inteligência Emocional",
    autor: "Daniel Goleman",
    tema: "Autocontrole",
    dificuldade: "impulsividade",
    titulo: "O teste do marshmallow",
    ideia:
      "Crianças que conseguiram esperar por uma recompensa maior, em vez de pegar a imediata, tornaram-se adultos mais equilibrados e bem-sucedidos. A capacidade de adiar a gratificação prevê mais coisas na vida do que o QI. É um músculo: treina-se resistindo a pequenos impulsos.",
    citacao: "Resistir ao impulso é a raiz de todo autocontrole. — Goleman",
    aplicacao:
      "Escolha hoje um impulso pequeno (um doce, abrir o feed, uma compra) e adie por 20 minutos. O objetivo não é o item, é o treino de esperar.",
    pergunta: "O que o teste do marshmallow revela sobre adiar a gratificação?",
  },
  {
    id: "ie-automotivacao",
    livro: "Inteligência Emocional",
    autor: "Daniel Goleman",
    tema: "Automotivação",
    dificuldade: "controle emocional",
    titulo: "Pôr a emoção a serviço da meta",
    ideia:
      "Quem controla as próprias emoções consegue se manter em movimento mesmo sem vontade, canalizando ansiedade em foco e frustração em esforço. A motivação não é esperada; é construída ordenando as emoções na direção de um objetivo.",
    citacao: "Ordenar as emoções a serviço de uma meta é essencial. — Goleman",
    aplicacao:
      "Quando bater a falta de vontade, não espere ela passar: faça os primeiros 5 minutos da tarefa. A ação costuma puxar a motivação, não o contrário.",
    pergunta: "Como transformar uma emoção difícil em combustível para a meta?",
  },
  {
    id: "ie-empatia",
    livro: "Inteligência Emocional",
    autor: "Daniel Goleman",
    tema: "Empatia",
    dificuldade: "relacionamento",
    titulo: "Ler o que o outro sente",
    ideia:
      "A empatia nasce da autoconsciência: quanto mais aberto você está às próprias emoções, melhor lê as dos outros — no tom de voz, no rosto, no que não foi dito. É a base de todo relacionamento e de toda liderança.",
    citacao: "A empatia se constrói sobre a consciência de si. — Goleman",
    aplicacao:
      "Numa conversa hoje, antes de responder, pergunte-se: 'o que essa pessoa está sentindo por trás do que disse?'.",
    pergunta: "De onde nasce a capacidade de entender o que o outro sente?",
  },
  {
    id: "ie-humor-pensamento",
    livro: "Inteligência Emocional",
    autor: "Daniel Goleman",
    tema: "Regulação",
    dificuldade: "controle emocional",
    titulo: "O humor distorce o pensamento",
    ideia:
      "Quando você está com raiva ou ansioso, a mente recruta automaticamente memórias e argumentos que confirmam aquele estado, criando uma bola de neve. O pensamento no calor da emoção quase nunca é confiável — ele serve à emoção, não à verdade.",
    citacao: "No calor da raiva, a mente só junta provas para a raiva.",
    aplicacao:
      "Regra pessoal: nenhuma decisão importante (mensagem séria, escolha grande) enquanto a emoção estiver em pico. Decida depois que o corpo acalmar.",
    pergunta: "Por que não se deve confiar no raciocínio feito no auge de uma emoção?",
  },
  {
    id: "ie-respiracao",
    livro: "Inteligência Emocional",
    autor: "Daniel Goleman",
    tema: "Regulação",
    dificuldade: "impulsividade",
    titulo: "Esfriar antes de agir",
    ideia:
      "A excitação fisiológica da raiva leva tempo para baixar. Insistir no assunto a alimenta; afastar-se e deixar o corpo desacelerar é o que realmente corta o ciclo. Não é fugir — é dar ao cérebro racional a chance de voltar ao comando.",
    citacao: "Dar um tempo é deixar a fisiologia da raiva se dissipar.",
    aplicacao:
      "Sentindo a raiva subir, saia fisicamente da situação por alguns minutos (caminhe, respire devagar) antes de retomar a conversa.",
    pergunta: "Por que se afastar por alguns minutos desarma melhor a raiva do que discutir na hora?",
  },

  // ── 12 Regras para a Vida — Jordan Peterson ──────────────────────────────
  {
    id: "12r-responsabilidade",
    livro: "12 Regras para a Vida",
    autor: "Jordan Peterson",
    tema: "Responsabilidade",
    dificuldade: "controle emocional",
    titulo: "Assumir a responsabilidade pela própria vida",
    ideia:
      "Sentido não vem de buscar prazer ou evitar dor, mas de assumir o peso da própria existência — arrumar o que está ao seu alcance em vez de culpar o mundo. Quanto mais responsabilidade você carrega de propósito, mais firme fica diante das emoções.",
    citacao: "O sentido se encontra ao assumir responsabilidade, não ao fugir dela. — Peterson",
    aplicacao:
      "Hoje, conserte uma coisa pequena que é claramente sua responsabilidade e que você vinha empurrando. Comece pelo que está ao alcance da mão.",
    pergunta: "De onde vem o sentido, segundo Peterson — do prazer ou da responsabilidade?",
  },
  {
    id: "12r-comparar-consigo",
    livro: "12 Regras para a Vida",
    autor: "Jordan Peterson",
    tema: "Comparação",
    dificuldade: "controle emocional",
    titulo: "Comparar-se com quem você foi ontem",
    ideia:
      "Comparar-se com os outros é uma armadilha: sempre haverá alguém à frente, e a inveja só envenena. O parâmetro útil é você mesmo no passado. Melhor 1% hoje em relação a ontem é progresso real e sob seu controle.",
    citacao: "Compare-se com quem você era ontem, não com quem outra pessoa é hoje. — Peterson",
    aplicacao:
      "Defina uma única melhora de 1% para hoje em relação a ontem e cumpra. Ignore onde os outros estão.",
    pergunta: "Qual é a única comparação que vale a pena fazer?",
  },
  {
    id: "12r-postura",
    livro: "12 Regras para a Vida",
    autor: "Jordan Peterson",
    tema: "Postura",
    dificuldade: "controle emocional",
    titulo: "Ombros para trás, coluna ereta",
    ideia:
      "Corpo e mente formam um laço: adotar uma postura ereta e confiante muda a própria química — você se sente mais capaz e o mundo responde melhor a você. Encolher-se realimenta a derrota; endireitar-se sinaliza, a si mesmo, que vai enfrentar o dia.",
    citacao: "Endireite-se e enfrente o fardo da vida de cabeça erguida. — Peterson",
    aplicacao:
      "Ao perceber que está encolhido (no celular, curvado), endireite a coluna, ombros para trás e respire fundo uma vez. Repita ao longo do dia.",
    pergunta: "Por que a postura física influencia o estado emocional?",
  },
  {
    id: "12r-verdade",
    livro: "12 Regras para a Vida",
    autor: "Jordan Peterson",
    tema: "Verdade",
    dificuldade: "controle emocional",
    titulo: "Dizer a verdade — ou ao menos não mentir",
    ideia:
      "Cada pequena mentira (inclusive as que você conta a si mesmo) enfraquece o caráter e distorce a realidade em que você vive. Falar a verdade, ou no mínimo recusar-se a mentir, mantém você alinhado com o que é real — e o que é real é mais fácil de enfrentar.",
    citacao: "Diga a verdade. Ou, pelo menos, não minta. — Peterson",
    aplicacao:
      "Hoje, pegue-se em uma pequena mentira de conveniência (um exagero, um 'tá tudo bem' falso) e troque pela verdade simples.",
    pergunta: "Por que até as pequenas mentiras enfraquecem você?",
  },
  {
    id: "12r-ordem-caos",
    livro: "12 Regras para a Vida",
    autor: "Jordan Peterson",
    tema: "Ordem e caos",
    dificuldade: "impulsividade",
    titulo: "Organize seu próprio caos primeiro",
    ideia:
      "Antes de querer consertar o mundo, ponha ordem no que é seu — seu quarto, sua rotina, seus compromissos. A ordem externa que você cria devolve clareza interna, e clareza interna reduz a ansiedade que alimenta os impulsos.",
    citacao: "Arrume sua casa antes de criticar o mundo. — Peterson",
    aplicacao:
      "Escolha um espaço pequeno (a mesa, a mochila, a caixa de entrada) e deixe em ordem agora. Note como a mente acompanha.",
    pergunta: "Por que organizar o próprio caos vem antes de mudar o mundo?",
  },
  {
    id: "12r-amizades",
    livro: "12 Regras para a Vida",
    autor: "Jordan Peterson",
    tema: "Ambiente",
    dificuldade: "controle emocional",
    titulo: "Cerque-se de quem quer o seu bem",
    ideia:
      "Você se torna parecido com quem anda. Pessoas que torcem pelo seu progresso puxam você para cima; as que normalizam a estagnação te seguram lá embaixo. Escolher boas companhias é um ato de autocuidado, não de arrogância.",
    citacao: "Faça amizade com quem deseja o melhor para você. — Peterson",
    aplicacao:
      "Identifique uma relação que te puxa para baixo e uma que te puxa para cima. Dê hoje um passo para aproximar-se da segunda.",
    pergunta: "Por que a escolha das companhias molda quem você se torna?",
  },
  {
    id: "12r-momento-presente",
    livro: "12 Regras para a Vida",
    autor: "Jordan Peterson",
    tema: "Presença",
    dificuldade: "impulsividade",
    titulo: "Preste atenção no que está bem à frente",
    ideia:
      "O dia inteiro a mente foge para o futuro ansioso ou para o passado. Trazer a atenção de volta para a tarefa concreta diante de você corta o ruído e a impulsividade nasce, em boa parte, da fuga desse ruído. Atenção plena no presente é um freio para o impulso.",
    citacao: "Preste atenção. Concentre-se no que está diante de você. — Peterson",
    aplicacao:
      "Ao se pegar disperso ou prestes a fugir para o celular, volte a atenção por 60 segundos só para a tarefa atual, com os sentidos.",
    pergunta: "Como a atenção ao presente ajuda a conter a impulsividade?",
  },

  // ── Diário Estoico — sabedoria estoica (Marco Aurélio, Sêneca, Epicteto) ──
  // Conceitos da tradição estoica de domínio público; a aplicação é minha.
  {
    id: "est-dicotomia",
    livro: "Diário Estoico",
    autor: "Epicteto",
    tema: "Dicotomia do controle",
    dificuldade: "controle emocional",
    titulo: "O que depende de você",
    ideia:
      "O estoicismo divide o mundo em dois: o que está sob seu controle (suas escolhas, esforço, atitude) e o que não está (resultados, opinião alheia, o passado). Sofrimento nasce de tentar controlar o incontrolável. Paz nasce de investir só no que é seu.",
    citacao: "Há coisas que dependem de nós e outras que não. — Epicteto",
    aplicacao:
      "Diante de uma irritação, pergunte: 'isto está sob meu controle?'. Se não, solte. Se sim, aja — sem reclamar.",
    pergunta: "Quais são as duas categorias da dicotomia do controle?",
  },
  {
    id: "est-julgamento",
    livro: "Diário Estoico",
    autor: "Epicteto",
    tema: "Julgamento",
    dificuldade: "controle emocional",
    titulo: "Não é o fato, é o que você pensa dele",
    ideia:
      "O que te perturba não é o evento em si, mas o julgamento que você faz dele. Entre o que acontece e a sua dor existe uma opinião — e a opinião pode ser revista. Mude a interpretação e a emoção muda junto.",
    citacao: "Não são as coisas que perturbam os homens, mas as opiniões sobre elas. — Epicteto",
    aplicacao:
      "Quando algo te irritar, separe o fato cru ('ele não respondeu') do julgamento ('ele me despreza'). Ataque o julgamento.",
    pergunta: "Segundo Epicteto, o que realmente causa a perturbação?",
  },
  {
    id: "est-premeditatio",
    livro: "Diário Estoico",
    autor: "Sêneca",
    tema: "Premeditação",
    dificuldade: "controle emocional",
    titulo: "Ensaiar a adversidade",
    ideia:
      "Imaginar de antemão o que pode dar errado (premeditatio malorum) tira o poder de choque do imprevisto e revela que quase tudo é suportável. Não é pessimismo — é preparo, para agir com calma quando a dificuldade vier.",
    citacao: "É na bonança que a alma deve se preparar para a dificuldade. — Sêneca",
    aplicacao:
      "Antes de algo importante, gaste 2 min imaginando os obstáculos prováveis e como você responderia com serenidade.",
    pergunta: "Para que serve a premeditatio malorum?",
  },
  {
    id: "est-memento-mori",
    livro: "Diário Estoico",
    autor: "Marco Aurélio",
    tema: "Finitude",
    dificuldade: "controle emocional",
    titulo: "Memento mori",
    ideia:
      "Lembrar que a vida é finita não é mórbido: é o que dá urgência e clareza. Saber que o tempo acaba faz você parar de adiar o que importa e de gastar energia com trivialidades e ofensas pequenas.",
    citacao: "Você poderia deixar a vida agora mesmo; que isso governe o que faz. — Marco Aurélio",
    aplicacao:
      "Ao se irritar com algo pequeno, pergunte: 'isto vai importar daqui a um ano? E no fim da vida?'.",
    pergunta: "Por que lembrar da morte (memento mori) ajuda a agir melhor hoje?",
  },
  {
    id: "est-amor-fati",
    livro: "Diário Estoico",
    autor: "Marco Aurélio",
    tema: "Aceitação",
    dificuldade: "controle emocional",
    titulo: "Amor fati — amar o destino",
    ideia:
      "Não basta aceitar o que acontece; o estoico aprende a usar tudo — inclusive o obstáculo — como combustível. O que está no caminho vira o caminho. Resistir ao que já é gasta energia; transformar é onde está a força.",
    citacao: "O impedimento à ação faz avançar a ação. O que está no caminho vira o caminho. — Marco Aurélio",
    aplicacao:
      "Diante de um contratempo hoje, pergunte: 'como posso usar isto a meu favor?' em vez de só reclamar.",
    pergunta: "O que significa 'o obstáculo é o caminho'?",
  },
  {
    id: "est-agora",
    livro: "Diário Estoico",
    autor: "Marco Aurélio",
    tema: "Presente",
    dificuldade: "impulsividade",
    titulo: "Governe só este momento",
    ideia:
      "Você não carrega o peso de toda a vida de uma vez — só do instante presente. Ninguém perde o passado nem o futuro, apenas o agora. Focar a ação no presente reduz a ansiedade e corta a fuga impulsiva para a distração.",
    citacao: "Confina-te ao presente. — Marco Aurélio",
    aplicacao:
      "Sobrecarregado? Reduza a pergunta a 'qual é a única próxima ação, agora?' e faça só ela.",
    pergunta: "Por que concentrar-se no presente reduz a ansiedade?",
  },
];

// Semeia os conceitos curados na 1ª vez (ou após reinstalar, quando o IndexedDB
// volta vazio). Não sobrescreve cartões que o usuário já tenha — só insere os que
// faltam, para que novas curadorias entrem em atualizações futuras sem apagar o
// progresso de revisão.
export async function seedBibliotecaSeNecessario(): Promise<void> {
  try {
    const existentes = new Set((await db.leituras.toArray()).map((c) => c.id));
    const hoje = hojeChave();
    const novos: CartaoLeitura[] = CONCEITOS_SEED.filter(
      (c) => !existentes.has(c.id),
    ).map((c) => ({
      ...c,
      origem: "curado",
      caixa: 0,
      proximaRevisao: hoje, // disponível para leitura imediata
      revisoes: 0,
      lido: false,
      criadoEm: hoje,
    }));
    if (novos.length) await db.leituras.bulkPut(novos);
  } catch {
    /* sem seed disponível */
  }
}
