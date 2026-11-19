// Configurações → Backup (só admin): funções puras de formatação (testadas no Node).
const TIPOS = {
  diario: "Diário",
  semanal: "Semanal",
  manual: "Manual",
  atualizacao: "Antes de atualizar",
  "pre-restore": "Antes de restaurar",
};
const UNIDADES = ["B", "KB", "MB", "GB", "TB"];

const formatadores = new Map();
function formatador(fuso) {
  let f = formatadores.get(fuso);
  if (!f) {
    const opcoes = {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      hourCycle: "h23",
    };
    try {
      f = new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: fuso });
    } catch {
      f = new Intl.DateTimeFormat("pt-BR", opcoes); // fuso inválido: o do navegador
    }
    formatadores.set(fuso, f);
  }
  return f;
}

function quando(iso, fuso) {
  const t = Date.parse(String(iso ?? ""));
  if (Number.isNaN(t)) return "—";
  const p = {};
  for (const parte of formatador(fuso).formatToParts(t)) p[parte.type] = parte.value;
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** "12,4 MB": base 1024, uma casa decimal a partir de KB, vírgula decimal. */
export function formatarTamanho(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "—";
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < UNIDADES.length - 1) {
    valor /= 1024;
    i += 1;
  }
  const texto = i === 0 ? String(Math.round(valor)) : valor.toFixed(1).replace(".", ",");
  return `${texto} ${UNIDADES[i]}`;
}

/** Linha de uma cópia: o nome vai inteiro (a tela quebra a linha, nunca corta). */
export function linhaDoBackup(b, fuso) {
  const tipo = String(b.tipo ?? "");
  return {
    nome: String(b.nome ?? ""),
    tipo: TIPOS[tipo] ?? tipo,
    quando: quando(b.criado_em, fuso),
    tamanho: formatarTamanho(b.tamanho),
  };
}

/** Frase do topo do cartão: último backup bem-sucedido e seu tamanho. */
export function resumoDoUltimo(status, fuso) {
  const s = status || {};
  if (!s.ultimo_em) return "Ainda não houve backup.";
  const q = quando(s.ultimo_em, fuso);
  return `Último backup: ${q} (${formatarTamanho(s.ultimo_tamanho)}).`;
}
