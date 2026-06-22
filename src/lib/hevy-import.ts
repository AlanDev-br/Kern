"use client";

import { db, type Treino } from "./db";

// Parser de CSV com aspas (lida com vírgulas e quebras dentro de campos).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignora
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const MES: Record<string, number> = {
  jan: 0, feb: 1, fev: 1, mar: 2, apr: 3, abr: 3, may: 4, mai: 4, jun: 5,
  jul: 6, aug: 7, ago: 7, sep: 8, set: 8, oct: 9, out: 9, nov: 10, dec: 11, dez: 11,
};

// "22 Jun 2026, 07:49" → Date
function parseData(s: string): Date | null {
  const m = s.match(/(\d{1,2})\s+(\w{3})\w*\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const mes = MES[m[2].toLowerCase()];
  if (mes === undefined) return null;
  return new Date(+m[3], mes, +m[1], +m[4], +m[5]);
}

export interface ResultadoImport {
  treinos: number;
  rotinas: number;
  sets: number;
}

// Importa o CSV de export do Hevy → grava treinos e cria rotinas pelos títulos.
export async function importarHevyCsv(texto: string): Promise<ResultadoImport> {
  const rows = parseCsv(texto);
  if (rows.length < 2) return { treinos: 0, rotinas: 0, sets: 0 };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (n: string) => header.indexOf(n);
  const iTitle = idx("title");
  const iStart = idx("start_time");
  const iEnd = idx("end_time");
  const iEx = idx("exercise_title");
  const iType = idx("set_type");
  const iW = idx("weight_kg");
  const iR = idx("reps");

  const mapa = new Map<string, Treino>();
  let sets = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const startRaw = row[iStart];
    const nome = row[iEx];
    if (!startRaw || !nome) continue;
    const d = parseData(startRaw);
    if (!d) continue;
    const id = d.toISOString();

    let t = mapa.get(id);
    if (!t) {
      const fim = iEnd >= 0 ? parseData(row[iEnd] || "") : null;
      t = {
        id,
        titulo: row[iTitle] || "Treino",
        inicio: id,
        fim: fim ? fim.toISOString() : undefined,
        exercicios: [],
      };
      mapa.set(id, t);
    }

    let ex = t.exercicios.find((e) => e.nome === nome);
    if (!ex) {
      ex = { nome, sets: [] };
      t.exercicios.push(ex);
    }
    const peso = parseFloat((row[iW] || "").replace(",", ".")) || 0;
    const reps = parseInt(row[iR] || "", 10) || 0;
    ex.sets.push({ peso, reps, tipo: row[iType] || "normal" });
    sets++;
  }

  const treinos = [...mapa.values()];
  if (treinos.length) await db.treinos.bulkPut(treinos);

  // rotinas = treino mais recente de cada título (vira template)
  const porTitulo = new Map<string, Treino>();
  for (const t of [...treinos].sort((a, b) => (a.inicio < b.inicio ? -1 : 1))) {
    porTitulo.set(t.titulo, t);
  }
  const rotinas = [...porTitulo.values()].map((t) => ({
    id: `rot-${t.titulo}`,
    nome: t.titulo,
    exercicios: t.exercicios.map((e) => ({ nome: e.nome, series: e.sets.length })),
  }));
  if (rotinas.length) await db.rotinas.bulkPut(rotinas);

  return { treinos: treinos.length, rotinas: rotinas.length, sets };
}
