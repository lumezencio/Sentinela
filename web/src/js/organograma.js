// Organograma (aba #organograma): alternativa 2D leve à Teia, em HTML/CSS. Um cartão por
// classe com contagem por estado e a grade dos equipamentos, piores estados primeiro, 50 por
// cartão. Usa os mesmos filtros da Lista. Funções puras testadas no Node + o pedaço do
// componente "painel" (mesmo `this` do Alpine). Não importa nada de js/teia/ (só existe no
// bundle 3D): a paleta de reserva e o hash são cópias conferidas em organograma.test.mjs.
import { ESTADOS, filtrar, grupoDe, paginar } from "./lista.js";
import { vinculoDoGravador } from "./dependencia.js";
import { fichaDoEquipamento } from "./visoes.js";

const CLASSE_SERVIDOR = "sentinela";
const INTERVALO_MIN_MS = 500; // no máximo 2 renders/s vindos do WS

/** Gravidade para ordenar (menor = pior); vai em data-peso de cada item. */
export const GRAVIDADE = {
  offline: 0, inalcancavel: 1, instavel: 2, suspeito: 3, desconhecido: 4, pausado: 5, online: 6,
};

// cópia de js/teia/aparencia.js
export const PALETA_RESERVA = [
  "#7FB2E5", "#B79CE8", "#E58FB8", "#E8A27C",
  "#C9C46A", "#6CC6B8", "#9AA7F0", "#D69AD6",
];
const COR_VALIDA = /^#[0-9A-Fa-f]{6}$/;

// cópia de js/teia/hash.js: FNV-1a de 32 bits sobre os bytes UTF-8
export function hashTexto(texto) {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(String(texto))) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Cor da classe só se for #rrggbb; senão a reserva determinística pelo slug (igual à Teia). */
export function corSeguraDaClasse(classe) {
  const cor = classe?.cor;
  if (typeof cor === "string" && COR_VALIDA.test(cor)) return cor;
  return PALETA_RESERVA[hashTexto(String(classe?.slug ?? "")) % PALETA_RESERVA.length];
}

const chaveEstado = (estado) => (Object.hasOwn(GRAVIDADE, estado) ? estado : "desconhecido");
const pesoDe = (item) => GRAVIDADE[chaveEstado(item.estado)];
// só a câmera de um gravador agrupa sob ele; quem "depende de" outro equipamento fica solto
const filhoDeGravador = (it) => Boolean(it.pai_id) && vinculoDoGravador(it);
const porNome = (a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true });
const contagemZerada = () => ({
  online: 0, instavel: 0, offline: 0, inalcancavel: 0, pausado: 0, aguardando: 0,
});

/**
 * Uma entrada por classe (sem a do servidor; classes sem itens após o filtro omitidas), na
 * ordem Classe.ordem; itens (do store, não copiados) por gravidade e depois nome numérico.
 */
export function montarOrganograma(store, filtros) {
  const grupos = new Map();
  for (const item of filtrar(store, filtros, { campo: "nome", crescente: true })) {
    if (item.classe === CLASSE_SERVIDOR) continue;
    let lista = grupos.get(item.classe);
    if (!lista) grupos.set(item.classe, (lista = []));
    lista.push(item);
  }
  const ordenadas = [...store.ordemClasses].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const conhecidas = new Set(ordenadas.map((c) => c.slug));
  // equipamento de classe que o snapshot não trouxe: cartão no fim, com o slug como nome
  for (const slug of grupos.keys()) {
    if (!conhecidas.has(slug)) ordenadas.push({ slug, nome: slug, cor: "" });
  }
  // câmera atrás de gravador (Fase 3): depois das soltas, agrupada sob o gravador (por nome)
  const nomesPai = new Map();
  for (const lista of grupos.values()) {
    for (const it of lista) {
      if (filhoDeGravador(it) && !nomesPai.has(it.pai_id)) {
        const pai = store.itens.get(it.pai_id);
        nomesPai.set(it.pai_id, pai ? pai.nome : "");
      }
    }
  }
  const chavePai = (it) => (filhoDeGravador(it) ? `${nomesPai.get(it.pai_id)}\t${it.pai_id}` : "");
  const porPai = (a, b) =>
    (filhoDeGravador(a) ? 1 : 0) - (filhoDeGravador(b) ? 1 : 0) ||
    chavePai(a).localeCompare(chavePai(b), "pt-BR", { numeric: true });
  const porCanal = (a, b) => (a.canal ?? 0) - (b.canal ?? 0);
  const resultado = [];
  for (const classe of ordenadas) {
    const itens = grupos.get(classe.slug);
    if (!itens || !itens.length) continue;
    itens.sort((a, b) => porPai(a, b) || pesoDe(a) - pesoDe(b) || porCanal(a, b) || porNome(a, b));
    const contagem = contagemZerada();
    for (const it of itens) contagem[grupoDe(it.estado)] += 1;
    resultado.push({
      slug: classe.slug,
      nome: classe.nome,
      cor: corSeguraDaClasse(classe),
      contagem,
      itens,
      total: itens.length,
      nomesPai,
    });
  }
  return resultado;
}

/** Página de um cartão já pronta para a tela (objetos planos, sem referência ao store). */
export function paginaDoCartao(cartao, pagina) {
  const pag = paginar(cartao.itens, pagina);
  const itens = pag.itens.map((it) => {
    const chave = ESTADOS[it.estado] ? it.estado : "desconhecido";
    const est = ESTADOS[chave];
    return {
      id: it.id,
      nome: it.nome,
      peso: pesoDe(it),
      estadoClasse: `estado st-${chave}`,
      estadoIcone: `#${est.icone}`,
      estadoRotulo: est.dica ? `${est.rotulo} (${est.dica})` : est.rotulo,
    };
  });
  // grupos da página: as soltas (título vazio) e um por gravador, na ordem já ordenada
  const grupos = [];
  pag.itens.forEach((it, i) => {
    const pai = filhoDeGravador(it) ? it.pai_id : "";
    let g = grupos[grupos.length - 1];
    if (!g || g.pai !== pai) {
      const nome = pai ? (cartao.nomesPai && cartao.nomesPai.get(pai)) || "" : "";
      let titulo = "";
      if (pai) titulo = nome ? `Atrás de ${nome}` : "Atrás do gravador";
      g = { chave: pai ? `pai-${pai}` : "soltos", pai, titulo, itens: [] };
      grupos.push(g);
    }
    g.itens.push(itens[i]);
  });
  for (const g of grupos) delete g.pai;
  return { pagina: pag.pagina, paginas: pag.paginas, itens, grupos };
}

const CONTAGENS = [
  ["offline", "offline", "offline", "i-offline"],
  ["inalcancavel", "inalcançável", "inalcançáveis", "i-inalcancavel"],
  ["instavel", "instável", "instáveis", "i-instavel"],
  ["aguardando", "aguardando", "aguardando", "i-desconhecido"],
  ["pausado", "pausado", "pausados", "i-pausado"],
  ["online", "online", "online", "i-online"],
];

function contagensDeTela(contagem) {
  const lista = [];
  for (const [grupo, um, varios, icone] of CONTAGENS) {
    const n = contagem[grupo];
    if (!n) continue;
    lista.push({
      grupo,
      classe: `org-conta st-${grupo === "aguardando" ? "desconhecido" : grupo}`,
      icone: `#${icone}`,
      texto: `${n} ${n === 1 ? um : varios}`,
    });
  }
  return lista;
}

/** Estado e métodos do Organograma; `store` é o mesmo da lista (fora do Alpine). */
export function organogramaDoPainel(store) {
  const paginas = new Map(); // slug -> página atual (memória)
  const recolhidos = new Set(); // slugs recolhidos (memória, nunca persistido)
  let ultimo = 0;
  let adiado = 0;
  let focoAntesDoDialogo = null;
  let semFoco = false; // equipamento sumiu: não devolver foco a elemento prestes a sair do DOM

  return {
    orgCartoes: [],

    /** Chamado no init: sair da aba com o diálogo aberto fecha o diálogo (a página não fica inerte). */
    iniciarOrganograma() {
      window.addEventListener("hashchange", () => {
        if (this.aba !== "organograma") this.fecharNoOrganograma();
      });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) this.renderizarOrganograma(true);
      });
    },

    /** Chamado pelo renderizar() do app: no máximo 2 vezes por segundo. */
    renderizarOrganograma(imediato = false) {
      if (this.aba !== "organograma") return;
      // equipamento aberto sumiu do store: fecha o diálogo já, sem esperar o limite de render
      if (this.equipAberto && !store.itens.has(this.equip.id)) {
        const dlgAberto = this.$refs.dlgEquipOrg;
        // só marca se o diálogo está aberto: o evento "close" (assíncrono) é quem consome a marca
        if (dlgAberto && dlgAberto.open) semFoco = true;
        this.fecharNoOrganograma();
      }
      if (document.hidden) return; // aba oculta: nada de render (volta no visibilitychange)
      const agora = Date.now();
      if (!imediato && agora - ultimo < INTERVALO_MIN_MS) {
        if (!adiado) {
          adiado = window.setTimeout(() => {
            adiado = 0;
            if (document.hidden) return;
            this.renderizarOrganograma(true);
          }, INTERVALO_MIN_MS - (agora - ultimo));
        }
        return;
      }
      window.clearTimeout(adiado);
      adiado = 0;
      ultimo = agora;
      const filtros = { classe: this.filtroClasse, estado: this.filtroEstado, busca: this.busca };
      this.orgCartoes = montarOrganograma(store, filtros).map((c) => {
        const pag = paginaDoCartao(c, paginas.get(c.slug) || 1);
        paginas.set(c.slug, pag.pagina);
        const recolhido = recolhidos.has(c.slug);
        return {
          slug: c.slug,
          nome: c.nome,
          estilo: { "--cor-classe": c.cor },
          total: `${c.total} equipamento${c.total === 1 ? "" : "s"}`,
          contagens: contagensDeTela(c.contagem),
          itens: recolhido ? [] : pag.itens, // recolhido: nada de DOM para a grade
          grupos: recolhido ? [] : pag.grupos, // câmeras de gravador sob o gravador
          expandido: recolhido ? "false" : "true",
          aberto: !recolhido,
          idGrade: `org-grade-${c.slug}`,
          rotuloAlternar: `${recolhido ? "Expandir" : "Recolher"} ${c.nome}`,
          variasPaginas: !recolhido && pag.paginas > 1,
          infoPagina: `${pag.pagina} de ${pag.paginas}`,
          semAnterior: pag.pagina <= 1,
          semProxima: pag.pagina >= pag.paginas,
          rotuloAnterior: `Página anterior de ${c.nome}`,
          rotuloProxima: `Próxima página de ${c.nome}`,
        };
      });
      const dlg = this.$refs.dlgEquipOrg;
      if (dlg && dlg.open && !this.equipAberto) dlg.close();
      if (this.equipAberto) {
        const it = store.itens.get(this.equip.id);
        if (it) this.equip = fichaDoEquipamento(it, store);
      }
    },

    /** Filtro mudou (Lista ou Organograma): cada cartão volta à 1ª página. */
    zerarPaginasOrganograma() {
      paginas.clear();
      ultimo = 0; // ação do usuário: o próximo render não espera o intervalo
    },

    get orgVazio() {
      return this.carregado && this.orgCartoes.length === 0;
    },

    alternarClasse(slug) {
      if (recolhidos.has(slug)) recolhidos.delete(slug);
      else recolhidos.add(slug);
      this.renderizarOrganograma(true);
    },
    recolherTudo() {
      for (const c of store.ordemClasses) recolhidos.add(c.slug);
      for (const it of store.itens.values()) recolhidos.add(it.classe);
      this.renderizarOrganograma(true);
    },
    expandirTudo() {
      recolhidos.clear();
      this.renderizarOrganograma(true);
    },

    orgPaginaAnterior(slug) {
      paginas.set(slug, Math.max(1, (paginas.get(slug) || 1) - 1));
      this.renderizarOrganograma(true);
    },
    orgPaginaProxima(slug) {
      paginas.set(slug, (paginas.get(slug) || 1) + 1); // paginar() limita à última
      this.renderizarOrganograma(true);
    },

    // ---------- painel do equipamento (mesma ficha/histórico/pausa da Teia, em <dialog>) ----------
    abrirNoOrganograma(id) {
      if (!store.itens.has(id)) return;
      focoAntesDoDialogo = document.activeElement;
      this.abrirEquipamento(id);
      const dlg = this.$refs.dlgEquipOrg;
      if (dlg && !dlg.open) dlg.showModal();
      this.$nextTick(() => this.$refs.tituloEquipOrg && this.$refs.tituloEquipOrg.focus());
    },
    fecharNoOrganograma() {
      const dlg = this.$refs.dlgEquipOrg;
      if (dlg && dlg.open) dlg.close(); // o evento "close" faz o resto
    },
    /** <dialog> fechou (botão, Esc ou troca de aba): fecha o painel e devolve o foco. */
    aoFecharDialogoOrg() {
      const voltar = semFoco ? null : focoAntesDoDialogo;
      semFoco = false;
      focoAntesDoDialogo = null;
      this.fecharEquipamento(false);
      if (voltar && voltar.isConnected && typeof voltar.focus === "function") voltar.focus();
    },
  };
}
