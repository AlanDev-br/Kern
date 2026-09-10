// Testa as regras de fusao com conflitos montados a mao. Sem navegador e sem
// banco: as regras sao funcoes puras justamente para isto.
//
// Cada caso e um conflito que VAI acontecer no uso real, nao um caso inventado.
import { fundirUniao, fundirDias, fundirRecente, fundirTabela, REGRAS } from './sincronia-fusao.ts';

let ok = 0, falhas = 0;
function conferir(nome, condicao, detalhe = '') {
  if (condicao) { ok++; console.log('OK    ' + nome); }
  else { falhas++; console.log('FALHA ' + nome + (detalhe ? '  — ' + detalhe : '')); }
}

// ── Uniao ──────────────────────────────────────────────────
{
  const local = [{ id: 'a', v: 1 }, { id: 'b', v: 1 }];
  const remoto = [{ id: 'b', v: 1 }, { id: 'c', v: 1 }];
  const r = fundirUniao(local, remoto, 'id');
  conferir('uniao junta os dois lados sem duplicar', r.length === 3, 'deu ' + r.length);
  conferir('uniao preserva o que so existe no local', r.some((x) => x.id === 'a'));
  conferir('uniao traz o que so existe no remoto', r.some((x) => x.id === 'c'));
}
{
  // Mesmo registro editado dos dois lados: ganha o carimbo mais novo.
  const local = [{ id: 'a', peso: 80, atualizadoEm: '2026-09-01T10:00:00Z' }];
  const remoto = [{ id: 'a', peso: 82, atualizadoEm: '2026-09-05T10:00:00Z' }];
  const r = fundirUniao(local, remoto, 'id');
  conferir('uniao: o mais recente vence no empate de chave', r[0].peso === 82, 'deu ' + r[0].peso);
}
{
  // Sem carimbo nenhum, o local fica. Trocar o que ja esta aqui por um palpite
  // e a troca errada.
  const local = [{ id: 'a', v: 'local' }];
  const remoto = [{ id: 'a', v: 'remoto' }];
  const r = fundirUniao(local, remoto, 'id');
  conferir('uniao sem carimbo mantem o local', r[0].v === 'local');
}
{
  const local = [{ uid: 'apar1-x', v: 1 }];
  const remoto = [{ uid: 'apar2-x', v: 2 }];
  const r = fundirUniao(local, remoto, 'uid');
  conferir('uid de aparelhos diferentes nao colide', r.length === 2, 'deu ' + r.length);
}

// ── O caso que motiva tudo: mesmo dia, tarefas diferentes ──
{
  const recalc = (c) => ({ xp: c.length * 30, fechouInegociaveis: c.length >= 3 });
  const local = [{ data: '2026-09-10', concluidas: ['ineg-treino'], xp: 30, fechouInegociaveis: false }];
  const remoto = [{ data: '2026-09-10', concluidas: ['ineg-leitura'], xp: 30, fechouInegociaveis: false }];
  const r = fundirDias(local, remoto, recalc);
  conferir('mesmo dia vira UM dia', r.length === 1, 'deu ' + r.length);
  conferir('as tarefas dos dois aparelhos SOMAM', r[0].concluidas.length === 2, JSON.stringify(r[0].concluidas));
  conferir('o XP e recalculado, nao somado', r[0].xp === 60, 'deu ' + r[0].xp);
}
{
  // A armadilha que o recalculo evita: somar 30+30 daria 60 tambem, mas com a
  // MESMA tarefa dos dois lados daria 60 para uma tarefa so.
  const recalc = (c) => ({ xp: c.length * 30, fechouInegociaveis: c.length >= 3 });
  const local = [{ data: '2026-09-10', concluidas: ['ineg-treino'], xp: 30, fechouInegociaveis: false }];
  const remoto = [{ data: '2026-09-10', concluidas: ['ineg-treino'], xp: 30, fechouInegociaveis: false }];
  const r = fundirDias(local, remoto, recalc);
  conferir('mesma tarefa nos dois lados nao conta duas vezes', r[0].xp === 30, 'deu ' + r[0].xp);
}
{
  const recalc = (c) => ({ xp: c.length * 30, fechouInegociaveis: c.length >= 3 });
  const local = [{ data: '2026-09-10', concluidas: ['a', 'b'], xp: 60, fechouInegociaveis: false }];
  const remoto = [{ data: '2026-09-10', concluidas: ['c'], xp: 30, fechouInegociaveis: false }];
  const r = fundirDias(local, remoto, recalc);
  conferir('fechar o dia so acontece na uniao', r[0].fechouInegociaveis === true);
}
{
  const recalc = (c) => ({ xp: 0, fechouInegociaveis: false });
  const local = [{ data: '2026-09-10', concluidas: [], xp: 0, fechouInegociaveis: false, acordarManual: '06:30' }];
  const remoto = [{ data: '2026-09-10', concluidas: [], xp: 0, fechouInegociaveis: false, dormirManual: '23:00' }];
  const r = fundirDias(local, remoto, recalc);
  conferir('horario anotado a mao sobrevive dos dois lados',
    r[0].acordarManual === '06:30' && r[0].dormirManual === '23:00',
    JSON.stringify(r[0]));
}
{
  const recalc = (c) => ({ xp: 0, fechouInegociaveis: false });
  const local = [{ data: '2026-09-01', concluidas: ['x'], xp: 0, fechouInegociaveis: false }];
  const remoto = [{ data: '2026-09-02', concluidas: ['y'], xp: 0, fechouInegociaveis: false }];
  const r = fundirDias(local, remoto, recalc);
  conferir('dias diferentes nao se misturam', r.length === 2);
  conferir('a saida sai ordenada por data', r[0].data < r[1].data);
}

// ── Bloco ──────────────────────────────────────────────────
{
  const local = [{ id: 1 }, { id: 2 }];
  const remoto = [{ id: 9 }];
  conferir('bloco: o carimbo mais novo leva tudo', fundirRecente(local, remoto, 100, 200) === remoto);
  conferir('bloco: empate mantem o local', fundirRecente(local, remoto, 200, 200) === local);
  conferir('bloco: local mais novo nao e sobrescrito', fundirRecente(local, remoto, 300, 200) === local);
}

// ── Tabela sem regra e tabela local ────────────────────────
{
  const r = fundirTabela('tabelaQueNaoExiste', [{ id: 'a' }], [{ id: 'b' }]);
  conferir('tabela sem regra NAO atravessa', r.registros.length === 1, 'deu ' + r.registros.length);
}
{
  const r = fundirTabela('rascunhoTreino', [{ id: 'a' }], [{ id: 'b' }]);
  conferir('rascunho de treino nao atravessa', r.registros.length === 1);
}
{
  const r = fundirTabela('saudeSync', [{ tipo: 'passos' }], [{ tipo: 'sono' }]);
  conferir('estado do Health Connect nao atravessa', r.registros.length === 1);
}

// ── Cobertura: toda tabela do banco tem regra ──────────────
{
  const doBanco = ['dias','revisoes','dividas','conquistas','config','avatar','treinos','rotinas',
    'exImagens','leituras','rascunhoTreino','cardios','tarefas','avaliacoesMente','testesCognitivos',
    'exercicioConfigs','conversasCoach','meditacoes','medidasCorporais','saudeAmostras','saudeSync','pareceres'];
  const semRegra = doBanco.filter((t) => !REGRAS[t]);
  conferir('todas as 22 tabelas tem regra declarada', semRegra.length === 0, 'faltam: ' + semRegra.join(', '));
  const extras = Object.keys(REGRAS).filter((t) => !doBanco.includes(t));
  conferir('nenhuma regra aponta para tabela inexistente', extras.length === 0, 'sobrando: ' + extras.join(', '));
}

console.log('\n=== ' + ok + ' passaram, ' + falhas + ' falharam ===');
process.exit(falhas ? 1 : 0);
