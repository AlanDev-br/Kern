// Utilitários de data (local, sem fuso UTC para chaves do dia)

export function chaveDia(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

export function hojeChave(): string {
  return chaveDia(new Date());
}

export function parseChave(chave: string): Date {
  const [y, m, d] = chave.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Número do dia dentro dos 90 dias (D1 = primeiro dia). 1..90+
export function diaDoPlano(dataInicio: string, ref: Date = new Date()): number {
  const inicio = parseChave(dataInicio);
  inicio.setHours(0, 0, 0, 0);
  const r = new Date(ref);
  r.setHours(0, 0, 0, 0);
  const diff = Math.floor((r.getTime() - inicio.getTime()) / 86400000);
  return diff + 1;
}

// Chave da semana ISO ("YYYY-Www")
export function chaveSemana(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function ehDomingo(d: Date = new Date()): boolean {
  return d.getDay() === 0;
}

export function ehSabado(d: Date = new Date()): boolean {
  return d.getDay() === 6;
}

// Lista das últimas N chaves de dia (mais antiga -> mais recente)
export function ultimosDias(n: number, ref: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i);
    out.push(chaveDia(d));
  }
  return out;
}

export function nomeDiaSemana(d: Date = new Date()): string {
  return ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][d.getDay()];
}
