// Objetos 3D da Teia: servidor (núcleo, halo, 2 anéis), classes (esfera, halo, rótulo),
// equipamentos (esfera iluminada, halo e marca de estado), super-nós e campo de estrelas.
// Geometrias, materiais e texturas comuns ficam num "acervo" compartilhado: o dispose()
// deles vira no-op (o three-forcegraph descarta tudo de um nó que sai da cena) e só o
// acervo.liberar() os libera de verdade, no destruir() da Teia.
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Float32BufferAttribute, Group, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, Points, PointsMaterial, SphereGeometry, Sprite,
  SpriteMaterial, SRGBColorSpace, TorusGeometry,
} from "three";
import { aparenciaDe } from "./aparencia.js";

export const FUNDO = "#0e1016";
const TEXTO = "#E8EBF2";
const PRIMARIA = "#8793E8";
const ACENTO = "#68C7BC";
const NUCLEO = "#dfe4ff";

/** Opacidade das partes esmaecidas quando outra classe está em foco. */
export const OPACIDADE_ESMAECIDA = 0.15;

export const TAMANHO = {
  equipamento: 2.4, haloEquipamento: 13, marca: 8.5,
  classe: 6.5, haloClasse: 44,
  nucleo: 14, haloServidor: 110,
};

const naoRaycast = () => {};

/** Acervo de recursos compartilhados (pura: não depende de three). */
export function criarAcervo() {
  const recursos = new Map();
  return {
    obter(chave, criar) {
      let r = recursos.get(chave);
      if (!r) {
        r = criar();
        const real = r.dispose.bind(r);
        r.dispose = () => {}; // compartilhado: só o acervo libera
        r.liberarDeVerdade = real;
        recursos.set(chave, r);
      }
      return r;
    },
    get tamanho() {
      return recursos.size;
    },
    liberar() {
      for (const r of recursos.values()) r.liberarDeVerdade();
      recursos.clear();
    },
  };
}

const novoCanvas = (l, a) => {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = a;
  return c;
};

function textura(canvas) {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// ---------- texturas comuns ----------
// Brilho radial do protótipo: 1 no centro, 0.55 a 25% do raio, 0 na borda.
const alfaBrilho = (r) => (r < 0.25 ? 1 - (0.45 * r) / 0.25 : 0.55 * (1 - (r - 0.25) / 0.75));

function desenharBrilho(canvas, expoente) {
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (let i = 0; i <= 16; i++) {
    const r = i / 16;
    gr.addColorStop(r, `rgba(255,255,255,${(alfaBrilho(r) ** expoente).toFixed(4)})`);
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
}

function texBrilho(acervo) {
  return acervo.obter("tex:brilho", () => {
    const c = novoCanvas(128, 128);
    desenharBrilho(c, 1);
    const t = textura(c);
    t.userData.canvas = c;
    return t;
  });
}

/**
 * Com bloom a cena é composta em espaço linear e só depois convertida para sRGB: a cauda
 * fraca do brilho aditivo ficaria amplificada (halo vira disco chapado). Redesenha o brilho
 * com a queda "linearizada" (alfa^2.2); chamado uma vez, quando o bloom liga.
 */
export function brilhoParaComposicaoLinear(acervo) {
  const t = texBrilho(acervo);
  desenharBrilho(t.userData.canvas, 2.2);
  t.needsUpdate = true;
}

function texMarca(acervo, forma) {
  return acervo.obter(`tex:${forma}`, () => {
    const c = novoCanvas(64, 64), g = c.getContext("2d");
    g.strokeStyle = "#ffffff";
    g.lineCap = "round";
    if (forma === "anel") {
      g.lineWidth = 5;
      g.beginPath();
      g.arc(32, 32, 24, 0, Math.PI * 2);
      g.stroke();
    } else {
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(16, 16); g.lineTo(48, 48);
      g.moveTo(48, 16); g.lineTo(16, 48);
      g.stroke();
    }
    return textura(c);
  });
}

// ---------- rótulos (texto do servidor só como textura de canvas, nunca HTML) ----------
function desenharRotulo(canvas, texto, cor) {
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, canvas.width, canvas.height);
  let px = 44;
  const fonte = (p) => `600 ${p}px "Segoe UI", system-ui, sans-serif`;
  g.font = fonte(px);
  while (px > 18 && g.measureText(texto).width > canvas.width - 24) g.font = fonte(--px);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = cor;
  g.shadowBlur = 18;
  g.fillStyle = TEXTO;
  g.fillText(texto, canvas.width / 2, canvas.height / 2);
}

/** Sprite de texto com textura própria (descartada junto com o nó). */
export function criarRotulo(texto, cor) {
  const canvas = novoCanvas(512, 96);
  desenharRotulo(canvas, texto, cor);
  const s = new Sprite(new SpriteMaterial({ map: textura(canvas), transparent: true, depthWrite: false }));
  s.scale.set(64, 12, 1);
  s.raycast = naoRaycast;
  s.userData = { canvas, texto, cor };
  return s;
}

export function atualizarRotulo(sprite, texto, cor) {
  const u = sprite.userData;
  if (u.texto === texto && u.cor === cor) return;
  desenharRotulo(u.canvas, texto, cor);
  u.texto = texto;
  u.cor = cor;
  sprite.material.map.needsUpdate = true;
}

// ---------- materiais comuns ----------
const opacidadeDe = (base, esmaecido) => (esmaecido ? OPACIDADE_ESMAECIDA : base);

function matSolido(acervo, cor, opacidade, esmaecido) {
  const op = opacidadeDe(opacidade, esmaecido);
  return acervo.obter(`mat:${cor}:${op}`, () => new MeshStandardMaterial({
    color: cor, emissive: cor, emissiveIntensity: 0.6, roughness: 0.45, metalness: 0.1,
    transparent: op < 1, opacity: op, depthWrite: op >= 1,
  }));
}

function matHalo(acervo, cor, opacidade, esmaecido) {
  const op = opacidadeDe(opacidade, esmaecido);
  return acervo.obter(`halo:${cor}:${op}`, () => new SpriteMaterial({
    map: texBrilho(acervo), color: cor, transparent: true, opacity: op, depthWrite: false,
    blending: AdditiveBlending,
  }));
}

function matMarca(acervo, forma, cor, esmaecido) {
  const op = esmaecido ? OPACIDADE_ESMAECIDA : 0.95;
  return acervo.obter(`marca:${forma}:${cor}:${op}`, () => new SpriteMaterial({
    // sem teste de profundidade: a marca ("anel"/"×") aparece por cima da própria esfera
    map: texMarca(acervo, forma), color: cor, transparent: true, opacity: op, depthWrite: false,
    depthTest: false,
  }));
}

const geoEsfera = (acervo, raio, seg) =>
  acervo.obter(`geo:esfera:${raio.toFixed(2)}:${seg}`, () => new SphereGeometry(raio, seg, seg));

// ---------- equipamento / super-nó (mesma estrutura, tamanhos diferentes) ----------
function criarCorpo(acervo, raio, resolucao) {
  const grupo = new Group();
  const halo = new Sprite();
  const esfera = new Mesh(geoEsfera(acervo, raio, resolucao));
  const marca = new Sprite();
  marca.renderOrder = 10;
  grupo.add(halo, esfera, marca);
  grupo.userData = { halo, esfera, marca, raio, aparencia: null, semente: Math.random() * 100 };
  return grupo;
}

/**
 * Reaplica a aparência do estado: cor, opacidade e marca ("anel" ou "×"). Pulso e tremor
 * ficam a cargo do laço de render (escala/posição), lidos de userData.aparencia.
 */
export function vestirCorpo(grupo, acervo, estado, esmaecido, escala = 1) {
  const ap = aparenciaDe(estado);
  const u = grupo.userData;
  u.aparencia = ap;
  u.esfera.material = matSolido(acervo, ap.cor, ap.opacidade, esmaecido);
  u.halo.material = matHalo(acervo, ap.cor, 0.55 * ap.opacidade, esmaecido);
  const lado = TAMANHO.haloEquipamento * escala;
  u.halo.scale.set(lado, lado, 1);
  u.esfera.scale.setScalar(1);
  u.esfera.position.set(0, 0, 0);
  const temMarca = ap.forma === "anel" || ap.forma === "cruz";
  u.marca.visible = temMarca;
  if (temMarca) {
    u.marca.material = matMarca(acervo, ap.forma, ap.cor, esmaecido);
    const m = TAMANHO.marca * escala * (ap.forma === "cruz" ? 0.8 : 1);
    u.marca.scale.set(m, m, 1);
  }
  return ap;
}

export function criarObjetoEquipamento(acervo, estado, { esmaecido = false, resolucao = 16 } = {}) {
  const g = criarCorpo(acervo, TAMANHO.equipamento, resolucao);
  vestirCorpo(g, acervo, estado, esmaecido);
  return g;
}

/** Super-nó do nível "agrupado": tamanho pela contagem, cor/marca pelo pior estado. */
export function criarObjetoGrupo(acervo, { raio, estado, texto, corClasse, esmaecido = false }) {
  const g = criarCorpo(acervo, raio, 24);
  const escala = raio / TAMANHO.equipamento;
  g.userData.escala = escala;
  vestirCorpo(g, acervo, estado, esmaecido, escala);
  const rot = criarRotulo(texto, corClasse);
  rot.position.y = raio + 8;
  g.add(rot);
  g.userData.rotulo = rot;
  return g;
}

// ---------- classe ----------
export function criarObjetoClasse(acervo, { cor, texto, esmaecido = false }) {
  const g = new Group();
  const halo = new Sprite();
  halo.raycast = naoRaycast; // o halo grande não rouba o clique dos equipamentos perto
  halo.scale.set(TAMANHO.haloClasse, TAMANHO.haloClasse, 1);
  const esfera = new Mesh(geoEsfera(acervo, TAMANHO.classe, 32));
  const rot = criarRotulo(texto, cor);
  rot.position.y = 14;
  g.add(halo, esfera, rot);
  g.userData = { halo, esfera, rotulo: rot };
  vestirClasse(g, acervo, cor, esmaecido);
  return g;
}

export function vestirClasse(grupo, acervo, cor, esmaecido) {
  const u = grupo.userData;
  u.esfera.material = matSolido(acervo, cor, 1, esmaecido);
  u.halo.material = matHalo(acervo, cor, 0.9, esmaecido);
  u.rotulo.material.opacity = esmaecido ? OPACIDADE_ESMAECIDA * 2 : 1;
}

// ---------- servidor ----------
export function criarObjetoServidor(acervo) {
  const g = new Group();
  const halo = new Sprite(acervo.obter("srv:halo", () => new SpriteMaterial({
    map: texBrilho(acervo), color: PRIMARIA, transparent: true, depthWrite: false, blending: AdditiveBlending,
  })));
  halo.scale.set(TAMANHO.haloServidor, TAMANHO.haloServidor, 1);
  halo.raycast = naoRaycast;
  const nucleo = new Mesh(
    geoEsfera(acervo, TAMANHO.nucleo, 48),
    acervo.obter("srv:nucleo", () => new MeshBasicMaterial({ color: NUCLEO })),
  );
  const geoAnel = acervo.obter("srv:geo-anel", () => new TorusGeometry(26, 0.6, 8, 96));
  const anel = new Mesh(geoAnel, acervo.obter("srv:anel1", () =>
    new MeshBasicMaterial({ color: ACENTO, transparent: true, opacity: 0.7 })));
  const anel2 = new Mesh(geoAnel, acervo.obter("srv:anel2", () =>
    new MeshBasicMaterial({ color: PRIMARIA, transparent: true, opacity: 0.7 })));
  anel2.scale.setScalar(1.35);
  anel.raycast = naoRaycast;
  anel2.raycast = naoRaycast;
  const rot = criarRotulo("SENTINELA", PRIMARIA);
  rot.position.y = -34;
  g.add(halo, nucleo, anel, anel2, rot);
  g.userData = { aneis: [anel, anel2] };
  return g;
}

// ---------- estrelas (fora do grafo; sem névoa; paralaxe lenta no laço de render) ----------
export function criarEstrelas(quantidade = 1500, semente = 366) {
  let s = semente;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pos = new Float32Array(quantidade * 3);
  for (let i = 0; i < quantidade; i++) {
    const cosT = r() * 2 - 1, sinT = Math.sqrt(1 - cosT * cosT), fi = r() * Math.PI * 2;
    const raio = 1800 + r() * 1400;
    pos[i * 3] = sinT * Math.cos(fi) * raio;
    pos[i * 3 + 1] = cosT * raio;
    pos[i * 3 + 2] = sinT * Math.sin(fi) * raio;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  const mat = new PointsMaterial({
    color: "#c8d0ff", size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.55,
    depthWrite: false, fog: false,
  });
  const pontos = new Points(geo, mat);
  pontos.raycast = naoRaycast;
  return pontos;
}
