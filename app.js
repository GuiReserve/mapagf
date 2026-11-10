/* Mapa GF Saneamento
   Um pino por companhia. Cada ficha guarda lead, produtos implementáveis, rastro de acompanhamento,
   anotações, atas e organograma. Registros: localStorage. Arquivos das atas: IndexedDB. */
(() => {
'use strict';

const KEY = 'gf-saneamento-v2';
const PRODUTOS = [['neoflow', 'VRP NeoFlow'], ['plugplay', 'Soluções Plug & Play'], ['hydroramal', 'Hydroramal']];
const PROD = Object.fromEntries(PRODUTOS);
const ESTAGIOS = [['prospeccao', 'Prospecção'], ['contato', 'Contato feito'], ['reuniao', 'Reunião'], ['proposta', 'Proposta'], ['negociacao', 'Negociação'], ['ganho', 'Ganho'], ['perdido', 'Perdido']];
const EST = Object.fromEntries(ESTAGIOS);
const ATIVOS = ['prospeccao', 'contato', 'reuniao', 'proposta', 'negociacao'];
const TEMPS = [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']];
const TEMP = Object.fromEntries(TEMPS);
const CANAIS = ['Ligação', 'E-mail', 'Reunião', 'Visita', 'WhatsApp', 'Outro'];
const LOGT = { interacao: 'Interações', lead: 'Lead', produto: 'Produtos', ata: 'Atas', org: 'Organograma', nota: 'Anotações', dados: 'Dados' };
const REGIOES = { 'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'], 'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'], 'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'], 'Sudeste': ['ES', 'MG', 'RJ', 'SP'], 'Sul': ['PR', 'RS', 'SC'] };
const REG_DE = {}; Object.entries(REGIOES).forEach(([r, l]) => l.forEach(u => { REG_DE[u] = r; }));
const REG_CLS = { 'Norte': 'n', 'Nordeste': 'ne', 'Centro-Oeste': 'co', 'Sudeste': 'se', 'Sul': 's' };
const UFS = Object.keys(UF_NOMES).sort();
const PIN = 'M0 0C-1.500-3.400-5.400-6.200-5.400-10.600A5.400 5.400 0 1 1 5.400-10.600C5.400-6.200 1.500-3.400 0 0Z';

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad = n => String(n).padStart(2, '0');
const isoDia = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoje = () => isoDia(new Date());
const addDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return isoDia(d); };
const agora = () => { const d = new Date(); return `${isoDia(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dataBR = s => s ? s.slice(0, 10).split('-').reverse().join('/') : '';
const dataCurta = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '';
function diaLabel(s) {
  if (s === hoje()) return 'Hoje';
  if (s === addDias(-1)) return 'Ontem';
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: y === new Date().getFullYear() ? undefined : 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const tamanho = b => b > 1048576 ? (b / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const moeda = v => brl.format(v || 0);
function moedaCurta(v) {
  v = Number(v) || 0;
  if (v >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
  if (v >= 1e3) return 'R$ ' + Math.round(v / 1e3).toLocaleString('pt-BR') + ' mil';
  return moeda(v);
}
const parseValor = s => { const n = Number(String(s || '').replace(/[^\d,]/g, '').replace(',', '.')); return isFinite(n) ? Math.round(n) : 0; };
const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICO = {
  interacao: '<path d="M3 3.5h10v6.500H7.500L4.500 12.500V10H3z"/>',
  lead: '<path d="M4 13.500V3h7.500L10 5.500 11.500 8H4"/>',
  produto: '<path d="M3.500 8.500l3 3 6-7"/>',
  ata: '<path d="M10.500 5.500l-4.600 4.600a1.500 1.500 0 0 0 2.100 2.100l5-5a3 3 0 0 0-4.200-4.200l-5 5a4.300 4.300 0 0 0 6.100 6.100l3.600-3.600"/>',
  org: '<circle cx="6" cy="5.500" r="2.200"/><path d="M2 13c.500-2.400 2-3.600 4-3.600s3.500 1.200 4 3.600"/><circle cx="11.500" cy="6.300" r="1.800"/><path d="M11 9.500c1.700 0 2.800 1.100 3.100 3.300"/>',
  nota: '<path d="M3 13l1-3.500 6.500-6.500 2.500 2.500L6.500 12z"/>',
  dados: '<path d="M3 13l1-3.500 6.500-6.500 2.500 2.500L6.500 12z"/>',
  filtro: '<path d="M2.500 3.500h11L9 9v4l-2 1V9z"/>'
};
const ico = (t, s = 16) => `<svg class="ti" viewBox="0 0 16 16" width="${s}" height="${s}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.600" stroke-linecap="round" stroke-linejoin="round">${ICO[t] || ICO.nota}</svg>`;
const pinIco = (ini, est, w = 14) => `<svg class="pico" width="${w}" height="${Math.round(w * 1.42)}" viewBox="-6.200 -17 12.400 17.600" aria-hidden="true"><path d="${PIN}" fill="var(--${ini === 'Privada' ? 'priv' : 'pub'})"/><circle cx="0" cy="-10.600" r="2.500" fill="${est ? `var(--tp-${est})` : '#fff'}"${est ? ' stroke="#fff" stroke-width=".9"' : ''}/></svg>`;

/* ---------- armazenamento ---------- */
let S = { reg: {}, custom: [], removidas: [], autor: '', estr: {} };
function carregaS(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.reg !== 'object') return false;
  S = { reg: raw.reg || {}, custom: Array.isArray(raw.custom) ? raw.custom : [], removidas: Array.isArray(raw.removidas) ? raw.removidas : [], autor: typeof raw.autor === 'string' ? raw.autor : '', estr: raw.estr && typeof raw.estr === 'object' ? raw.estr : {} };
  const MIG = { quente: 'alta', morno: 'media', frio: 'baixa' }, MIGT = { Quente: 'Alta', Morno: 'Média', Frio: 'Baixa' };
  Object.values(S.reg).forEach(r => {
    if (!r) return;
    if (r.lead && MIG[r.lead.temp]) r.lead.temp = MIG[r.lead.temp];
    (r.log || []).forEach(e => { const m = /^Temperatura: (Quente|Morno|Frio)$/.exec(e.txt || ''); if (m) e.txt = 'Temperatura: ' + MIGT[m[1]]; });
  });
  return true;
}
try { carregaS(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { /* segue em memória */ }
const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* idem */ } };
function reg(id) {
  if (!S.reg[id]) S.reg[id] = {};
  const r = S.reg[id];
  r.prod = r.prod || {}; r.atas = r.atas || []; r.org = r.org || []; r.notas = r.notas || ''; r.log = r.log || [];
  return r;
}
const ler = id => S.reg[id] || {};
const leadDe = id => ler(id).lead || null;
const logDe = id => (ler(id).log || []).slice().sort((a, b) => b.t.localeCompare(a.t));
const tempAt = l => (l && ATIVOS.includes(l.estagio) ? l.temp : '') || '';
const vencido = l => !!(l && ATIVOS.includes(l.estagio) && l.proxData && l.proxData < hoje());
const temRegistro = id => { const r = ler(id); return !!((r.notas || '').trim() || (r.atas || []).length || (r.org || []).length || (r.log || []).length || r.lead || PRODUTOS.some(([k]) => (r.prod || {})[k])); };
function logar(id, tipo, txt, extra = {}) {
  const log = reg(id).log, t = agora();
  if (extra.junta && log[0] && log[0].junta === extra.junta && log[0].autor === (S.autor || '') && (Date.now() - new Date(log[0].t).getTime()) < 180000) { log[0].txt = txt; log[0].t = t; return; }
  log.unshift({ id: uid('l'), t, tipo, txt, autor: S.autor || '', ...extra });
}

function companhias() {
  const base = COMPANHIAS.filter(c => !S.removidas.includes(c.id)).map(c => ({ ...c, ...((S.reg[c.id] || {}).edit || {}) }));
  return [...base, ...S.custom.map(c => ({ ...c, custom: true }))];
}
const companhia = id => companhias().find(c => c.id === id);

/* arquivos das atas */
const memoria = new Map();
let idb = null;
const idbPronto = new Promise(res => {
  try {
    const rq = indexedDB.open('gf-saneamento-atas', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('files');
    rq.onsuccess = () => { idb = rq.result; res(); };
    rq.onerror = () => res();
  } catch (e) { res(); }
});
const tx = (modo, fn) => new Promise((res, rej) => { const t = idb.transaction('files', modo); const r = fn(t.objectStore('files')); t.oncomplete = () => res(r.result); t.onerror = () => rej(t.error); });
async function arqPut(id, blob) { await idbPronto; if (!idb) { memoria.set(id, blob); return false; } try { await tx('readwrite', s => s.put(blob, id)); return true; } catch (e) { memoria.set(id, blob); return false; } }
async function arqGet(id) { await idbPronto; if (memoria.has(id)) return memoria.get(id); if (!idb) return null; try { return await tx('readonly', s => s.get(id)); } catch (e) { return null; } }
async function arqDel(id) { await idbPronto; memoria.delete(id); if (idb) { try { await tx('readwrite', s => s.delete(id)); } catch (e) { /* nada */ } } }

let downloads = null;
if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(d => { downloads = d; }).catch(() => {});

/* ---------- estado da tela ---------- */
const F0 = { q: '', ini: '', regiao: '', uf: '', grupo: '', tipo: '', estagio: '', temp: '', prod: '', resp: '', registro: false };
let F = { ...F0 };
let sel = '', view = 'mapa', orgSel = '', movendo = '', painel = false, corMapa = 'temp', fichaAba = 'resumo', tlTipo = '', tlMax = 80, primeira = true, notaMudou = false, ultimoCanal = 'Ligação';
try { orgSel = sessionStorage.getItem('gf-org') || ''; corMapa = ['regiao', 'nec'].includes(localStorage.getItem('gf-cor2')) ? localStorage.getItem('gf-cor2') : 'temp'; } catch (e) { /* sem armazenamento */ }
const lembra = (k, v) => { try { (k === 'gf-org' ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* idem */ } };

function passa(c, ignora = '') {
  const r = ler(c.id), l = r.lead;
  if (ignora !== 'ini' && F.ini && c.ini !== F.ini) return false;
  if (F.regiao && REG_DE[c.uf] !== F.regiao) return false;
  if (F.uf && c.uf !== F.uf) return false;
  if (F.grupo && (c.grupo || 'Sem grupo privado') !== F.grupo) return false;
  if (F.tipo && c.tipo !== F.tipo) return false;
  if (F.estagio) {
    if (F.estagio === 'sem') { if (l) return false; }
    else if (F.estagio === 'ativos') { if (!l || !ATIVOS.includes(l.estagio)) return false; }
    else if (F.estagio === 'vencidos') { if (!vencido(l)) return false; }
    else if (!l || l.estagio !== F.estagio) return false;
  }
  if (F.temp && (!l || l.temp !== F.temp)) return false;
  if (F.prod && !(r.prod || {})[F.prod]) return false;
  if (F.resp && (!l || l.resp !== F.resp)) return false;
  if (F.registro && !temRegistro(c.id)) return false;
  if (F.q && !norm(`${c.nome} ${c.cidade} ${c.grupo} ${c.uf} ${UF_NOMES[c.uf]} ${c.tipo}`).includes(norm(F.q))) return false;
  return true;
}
const filtradas = () => companhias().filter(c => passa(c));

/* ---------- filtros ---------- */
function renderFiltros() {
  const foco = document.activeElement && document.activeElement.id;
  const todas = companhias();
  const grupos = [...new Set(todas.map(c => c.grupo || 'Sem grupo privado'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const tipos = [...new Set(todas.map(c => c.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const nPainel = ['regiao', 'uf', 'grupo', 'tipo', 'temp', 'prod'].filter(k => F[k]).length;
  const opt = (lista, atual) => lista.map(([v, t]) => `<option value="${esc(v)}" ${atual === v ? 'selected' : ''}>${esc(t)}</option>`).join('');
  $('#f-dyn').innerHTML = `
    <div class="seg" role="group" aria-label="Iniciativa">${[['', 'Todas'], ['Pública', 'Públicas'], ['Privada', 'Privadas']].map(([v, t]) =>
      `<button type="button" class="${F.ini === v ? 'on' : ''}" aria-pressed="${F.ini === v}" data-act="ini" data-v="${v}">${v ? pinIco(v, '', 10) : ''}${t}</button>`).join('')}</div>
    <label class="fsel"><span class="sr">Situação do lead</span><select id="f-estagio" data-f="estagio">
      ${opt([['', 'Com ou sem lead'], ['ativos', 'Leads ativos'], ['sem', 'Sem lead']], F.estagio)}
      <optgroup label="Estágio do lead">${opt(ESTAGIOS, F.estagio)}</optgroup></select></label>
    <button type="button" class="btn ${painel ? 'on' : ''}" id="f-toggle" data-act="painel" aria-expanded="${painel}" aria-controls="f-painel">${ico('filtro')} <span class="m-off">Mais filtros</span><span class="m-on">Filtros</span>${nPainel ? ` <span class="badge">${nPainel}</span>` : ''}</button>`;
  const p = $('#f-painel');
  p.hidden = !painel;
  $('#fbar').classList.toggle('open', painel);
  p.innerHTML = `
    <label><span>Região</span><select id="f-regiao" data-f="regiao"><option value="">Todas</option>${opt(Object.keys(REGIOES).map(r => [r, r]), F.regiao)}</select></label>
    <label><span>Estado</span><select id="f-uf" data-f="uf"><option value="">Todos</option>${opt(UFS.filter(u => !F.regiao || REG_DE[u] === F.regiao).map(u => [u, `${u} · ${UF_NOMES[u]}`]), F.uf)}</select></label>
    <label><span>Grupo controlador</span><select id="f-grupo" data-f="grupo"><option value="">Todos</option>${opt(grupos.map(g => [g, g]), F.grupo)}</select></label>
    <label><span>Tipo de operação</span><select id="f-tipo" data-f="tipo"><option value="">Todos</option>${opt(tipos.map(t => [t, t]), F.tipo)}</select></label>
    <label><span>Temperatura do lead</span><select id="f-temp" data-f="temp"><option value="">Todas</option>${opt(TEMPS, F.temp)}</select></label>
    <label><span>Produto oferecido</span><select id="f-prod" data-f="prod"><option value="">Qualquer</option>${opt(PRODUTOS, F.prod)}</select></label>`;
  const ativos = [];
  if (F.q) ativos.push(['q', `Busca: ${F.q}`]);
  if (F.ini) ativos.push(['ini', F.ini === 'Privada' ? 'Privadas' : 'Públicas']);
  if (F.estagio) ativos.push(['estagio', { ativos: 'Leads ativos', vencidos: 'Próximo passo vencido', sem: 'Sem lead' }[F.estagio] || 'Lead: ' + EST[F.estagio]]);
  if (F.regiao) ativos.push(['regiao', 'Região: ' + F.regiao]);
  if (F.uf) ativos.push(['uf', 'Estado: ' + UF_NOMES[F.uf]]);
  if (F.grupo) ativos.push(['grupo', 'Grupo: ' + F.grupo]);
  if (F.tipo) ativos.push(['tipo', 'Tipo: ' + F.tipo]);
  if (F.temp) ativos.push(['temp', 'Temperatura: ' + TEMP[F.temp]]);
  if (F.prod) ativos.push(['prod', 'Oferecido: ' + PROD[F.prod]]);
  if (F.resp) ativos.push(['resp', 'Responsável: ' + F.resp]);
  if (F.registro) ativos.push(['registro', 'Com registro seu']);
  $('#f-ativos').innerHTML = ativos.length ? ativos.map(([k, t]) => `<button type="button" class="fchip" data-act="limpa-f" data-k="${k}" aria-label="Remover filtro ${esc(t)}">${esc(t)}<span aria-hidden="true">×</span></button>`).join('') +
    '<button type="button" class="link" data-act="limpa-tudo">Limpar todos</button>' : '';
  if (foco && foco !== 'busca' && document.getElementById(foco)) document.getElementById(foco).focus();
}
function aplicaFiltro(k, v) {
  F[k] = v;
  if (k === 'regiao' && F.uf && REG_DE[F.uf] !== F.regiao && F.regiao) F.uf = '';
  if (k === 'uf' && F.uf && F.regiao && REG_DE[F.uf] !== F.regiao) F.regiao = '';
  if (k === 'uf' || k === 'regiao') focaArea();
  renderTudo();
}

/* ---------- mapa ---------- */
const svg = $('#map'), NS = 'http://www.w3.org/2000/svg';
const VB0 = BR_MAP.viewBox.split(' ').map(Number);
let vb = VB0.slice(), anim = 0, proj = null;
const caixas = {};
const el = (n, a = {}) => { const e = document.createElementNS(NS, n); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
const merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
const k = () => vb[2] / VB0[2];

function montaMapa() {
  const vm = $('#view-mapa'), oculto = vm.hidden; vm.hidden = false;
  svg.setAttribute('viewBox', VB0.join(' '));
  const gUf = el('g', { id: 'g-uf' }), gLb = el('g', { id: 'g-lb', 'aria-hidden': 'true' }), gPin = el('g', { id: 'g-pin' }), gNec = el('g', { id: 'g-nec' });
  svg.append(gUf, gLb, gNec, gPin);
  UFS.forEach(uf => {
    const p = el('path', { d: BR_MAP.paths[uf], class: 'uf' }); p.dataset.uf = uf;
    gUf.append(p); caixas[uf] = p.getBBox();
  });
  const xW = caixas.AC.x, xE = caixas.PB.x + caixas.PB.width, yN = caixas.RR.y, yS = caixas.RS.y + caixas.RS.height;
  const LW = -73.99, LE = -34.79, mN = merc(5.27), mS = merc(-33.75);
  proj = (lat, lon) => [xW + (lon - LW) * (xE - xW) / (LE - LW), yN + (mN - merc(lat)) * (yS - yN) / (mN - mS)];
  const ajuste = { SC: [8, 0], RJ: [4, -3], ES: [2, 0], PI: [-4, 10], MA: [4, 4], AP: [-2, 6], GO: [-6, 8], RN: [0, -3], DF: [0, -9], SE: [-3, -3], AL: [-6, -2], PB: [-12, 0], PE: [-22, 1], CE: [0, 6], SP: [-12, -4], PR: [-8, -2], RS: [-10, -4], MG: [4, -10], BA: [-6, -6], TO: [0, 8], RO: [6, 2], MS: [0, 6], MT: [0, -6], AC: [6, 2], RR: [0, 8], AM: [0, 6], PA: [0, 8] };
  UFS.forEach(uf => {
    const b = caixas[uf], [dx, dy] = ajuste[uf] || [0, 0];
    const t = el('text', { class: 'lb' }); t.textContent = uf;
    t.dataset.x = b.x + b.width / 2 + dx; t.dataset.y = b.y + b.height / 2 + dy;
    gLb.append(t);
  });
  vm.hidden = oculto;
  eventosMapa();
}
function posicoes(lista) {
  const grupos = {};
  lista.forEach(c => {
    const r = S.reg[c.id] || {};
    c._p = r.pos || c.pos || proj(c.lat, c.lon);
    const chave = Math.round(c._p[0] / 4) + '_' + Math.round(c._p[1] / 4);
    (grupos[chave] = grupos[chave] || []).push(c);
  });
  Object.values(grupos).forEach(g => g.forEach((c, i) => {
    if (g.length === 1) { c._o = [0, 0]; return; }
    const raio = g.length <= 2 ? 5.500 : g.length <= 4 ? 7.500 : 9.500, a = Math.PI + i * 2 * Math.PI / g.length;
    c._o = [Math.cos(a) * raio, Math.sin(a) * raio * .8];
  }));
}
const PESO = { alta: 3, media: 2, baixa: 1 };

/* ---------- necessidade: perdas + investimento (Ranking do Saneamento 2026) ---------- */
const RK = window.RANKING || [], CINFO = window.CIA_INFO || {}, FONTE_RK = window.FONTE_RANKING || {};
const pctl = (v, arr) => { let a = 0, b = 0; arr.forEach(x => { if (x < v) a++; else if (x === v) b++; }); return (a + b / 2) / arr.length; };
const FX = {
  1: ['Mais necessidade', 'Visitar primeiro: proposta de VRP NeoFlow para setorização e redução de perdas, com o ganho em m³ por mês.'],
  2: ['Necessidade média', 'Qualificar antes de propor: confirmar orçamento e os setores com mais perdas.'],
  3: ['Menos necessidade', 'Acompanhar e visitar quando estiver na rota.']
};
const FORD = [1, 2, 3];
/* o ranking é sempre dentro de um estado ou de uma região */
const noEsc = uf => (!F.uf || uf === F.uf) && (!F.regiao || REG_DE[uf] === F.regiao);
const nomeEsc = () => F.uf ? UF_NOMES[F.uf] : F.regiao;
let NECUFS = new Set();
function garanteEscopo() {
  if (corMapa !== 'nec' || F.uf || F.regiao) return false;
  let r = 'Sudeste'; try { r = localStorage.getItem('gf-nec-reg') || r; } catch (e) { /* idem */ }
  F.regiao = REGIOES[r] ? r : 'Sudeste'; return true;
}
function necCalc() {
  const fc = faixasCias(c => noEsc(c.uf));
  terca(RK.filter(x => noEsc(x.uf)).sort((a, b) => b.nota - a.nota));
  const reg = F.uf ? REG_DE[F.uf] : F.regiao;
  NECUFS = new Set(REGIOES[reg]);
  terca(REGIOES[reg].map(u => UFM[u]).filter(Boolean).sort((a, b) => b.nota - a.nota));
  return fc;
}
function rankInfo(id, filtro) {
  const l = companhias().filter(filtro).map(c => necDe(c.id)).filter(Boolean).sort((a, b) => b.nota - a.nota || (a.est ? 1 : 0) - (b.est ? 1 : 0));
  const i = l.findIndex(o => o.id === id), n = l.length;
  return i < 0 ? null : { pos: i + 1, n, t: i < n / 3 ? 1 : i < 2 * n / 3 ? 2 : 3 };
}
const fxChip = t => `<span class="qd f-${t}">${FX[t][0]}</span>`;
const diag = o => `Perdas ${o.pp >= .5 ? 'acima' : 'abaixo'} da mediana · investimento ${o.pi >= .5 ? 'acima' : 'abaixo'} da mediana`;
const terca = l => { const n = l.length; l.forEach((o, i) => { o.t = i < n / 3 ? 1 : i < 2 * n / 3 ? 2 : 3; o.pos = i + 1; }); return l; };
function calcNec(lista) {
  const A = lista.map(x => x.ipd), B = lista.map(x => x.ipl), C = lista.map(x => x.inv);
  lista.forEach(x => { x.pp = (pctl(x.ipd, A) + pctl(x.ipl, B)) / 2; x.pi = pctl(x.inv, C); x.nota = Math.round((x.pp + x.pi) * 50) / 10; x.q = x.pp >= .5 ? (x.pi >= .5 ? 'ir' : 'precisa') : (x.pi >= .5 ? 'caixa' : 'baixa'); });
  return lista;
}
calcNec(RK);
terca(RK.slice().sort((a, b) => b.nota - a.nota));
const NEC = (() => {
  const m = {};
  RK.forEach(x => x.cias.forEach(id => {
    const o = m[id] = m[id] || { id, cid: [], pop: 0, a: 0, b: 0, inv: 0 };
    o.cid.push(x); o.inv += x.inv;
    if (!x.atip) { o.pop += x.pop; o.a += x.ipd * x.pop; o.b += x.ipl * x.pop; }
  }));
  const l = Object.values(m).filter(o => o.pop); l.forEach(o => { o.ipd = o.a / o.pop; o.ipl = o.b / o.pop; o.cid.sort((p, q) => q.nota - p.nota); });
  return Object.fromEntries(calcNec(l).map(o => [o.id, o]));
})();
const UFM = {};
RK.forEach(x => { const o = UFM[x.uf] = UFM[x.uf] || { uf: x.uf, n: 0, pp: 0, pi: 0, ipd: 0, nota: 0 }; o.n++; o.pp += x.pp; o.pi += x.pi; o.ipd += x.ipd; o.nota += x.nota; });
Object.values(UFM).forEach(o => { o.pp /= o.n; o.pi /= o.n; o.ipd /= o.n; o.nota /= o.n; });
terca(Object.values(UFM).sort((a, b) => b.nota - a.nota));
const ESTC = {};
function necDe(id) {
  if (NEC[id]) return NEC[id];
  const c = companhia(id), u = c && UFM[c.uf]; if (!u) return null;
  /* poucas cidades no estado = estimativa fraca: puxa para o meio da escala */
  const pp = (u.pp * u.n + .5 * 3) / (u.n + 3), pi = (u.pi * u.n + .5 * 3) / (u.n + 3);
  return ESTC[id] = ESTC[id] || { id, est: true, uf: c.uf, pp, pi, nota: Math.round((pp + pi) * 50) / 10, ipdUF: u.ipd, nUF: u.n, cid: [] };
}
function faixasCias(filtro = () => true) { return terca(companhias().filter(filtro).map(c => necDe(c.id)).filter(Boolean).sort((a, b) => b.nota - a.nota || (a.est ? 1 : 0) - (b.est ? 1 : 0))); }
const num1 = v => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const nf = v => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const mm = v => v >= 1000 ? 'R$ ' + num1(v / 1000) + ' bi' : 'R$ ' + Math.round(v).toLocaleString('pt-BR') + ' mi';
const corNec = n => `color-mix(in srgb, var(--nd) ${Math.round(14 + n * 8.6)}%, var(--surface))`;
let necAba = 'cias', necQ = '', necTudo = false;
/* logos enviados pelo usuário (IndexedDB) */
const logos = new Map();
const siglas = n => { const w = String(n).replace(/[()]/g, '').split(/\s+/).filter(x => x && !/^(de|do|da|das|dos|e|S\.A\.)$/i.test(x)); return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase(); };
const selo = (c, cls = '') => logos.has(c.id) ? `<span class="selo img ${cls}"><img src="${logos.get(c.id)}" alt=""></span>` : `<span class="selo ${cls}" aria-hidden="true">${esc(siglas(c.nome))}</span>`;
async function carregaLogos() {
  for (const id of Object.keys(S.reg)) if (S.reg[id].logo && !logos.has(id)) { const b = await arqGet('logo-' + id); if (b) logos.set(id, URL.createObjectURL(b)); }
}
function calor(lista) {
  const out = {};
  lista.forEach(c => { const t = tempAt(leadDe(c.id)); if (!t) return; const o = out[c.uf] = out[c.uf] || { s: 0, alta: 0, media: 0, baixa: 0 }; o.s += PESO[t]; o[t]++; });
  return out;
}
function corCalor(t) {
  return t <= .5 ? `color-mix(in srgb, var(--hm-2) ${Math.round(t * 200)}%, var(--hm-1))` : `color-mix(in srgb, var(--hm-3) ${Math.round((t - .5) * 200)}%, var(--hm-2))`;
}
function renderMapa() {
  const necFc = corMapa === 'nec' ? necCalc() : null;
  const lista = filtradas(), cal = calor(lista);
  const max = Math.max(1, ...Object.values(cal).map(o => o.s));
  svg.querySelectorAll('path.uf').forEach(p => {
    const uf = p.dataset.uf, fora = (F.regiao && REG_DE[uf] !== F.regiao) || (F.uf && uf !== F.uf);
    p.setAttribute('class', `uf ${corMapa === 'regiao' ? 'rg-' + REG_CLS[REG_DE[uf]] : 'heat'}${fora ? ' dim' : ''}${F.uf === uf ? ' foco' : ''}`);
    const o = cal[uf], tq = o ? (o.alta ? 'alta' : o.media ? 'media' : 'baixa') : '';
    p.style.fill = corMapa === 'nec' ? (UFM[uf] && NECUFS.has(uf) ? `var(--uf${UFM[uf].t})` : 'var(--land)') : corMapa === 'temp' && tq ? `color-mix(in srgb, var(--tp-${tq}) 62%, var(--surface))` : '';
  });
  $('#cor-toggle').innerHTML = [['temp', 'Temperatura'], ['regiao', 'Região'], ['nec', 'Necessidade']].map(([v, t]) => `<button type="button" class="${corMapa === v ? 'on' : ''}" aria-pressed="${corMapa === v}" data-act="cor" data-v="${v}">${t}</button>`).join('');
  const pinos = `<div class="lg-row"><span>${pinIco('Pública', '', 11)}Pública</span><span>${pinIco('Privada', '', 11)}Privada</span></div>`;
  const miolo = `<div class="lg-t">Miolo do pino</div><div class="lg-row">${TEMPS.map(([t, n]) => `<span><i class="dot" style="background:var(--tp-${t})"></i>${n}</span>`).join('')}<span><i class="dot w"></i>Sem lead</span></div>`;
  $('#view-mapa').classList.toggle('nec', corMapa === 'nec');
  $('#nec-painel').hidden = corMapa !== 'nec';
  if (corMapa === 'nec') {
    const fc = necFc, cont = { 1: 0, 2: 0, 3: 0 };
    (necAba === 'cias' ? fc : RK.filter(x => noEsc(x.uf))).forEach(o => { cont[o.t]++; });
    $('#legenda').innerHTML = `<div class="lg-t">${necAba === 'cias' ? 'Companhias' : 'Municípios'}: ranking em ${esc(nomeEsc())}</div>
      <div class="lg-fx" role="group" aria-label="Filtrar por faixa">${FORD.map(t => `<button type="button" class="${necQ === String(t) ? 'on' : ''}" aria-pressed="${necQ === String(t)}" data-act="nec-q" data-v="${necQ === String(t) ? '' : t}"><i class="sw f-${t}"></i>${FX[t][0]} <b>${cont[t]}</b></button>`).join('')}</div>
      <div class="lg-t">Estado</div><div class="lg-row">${FORD.map(t => `<span><i class="sw" style="background:var(--uf${t})"></i>${['Mais', 'Média', 'Menos'][t - 1]}</span>`).join('')}</div><p class="lg-n">${necAba === 'cias' ? 'Estados da região comparados entre si. Escuro = topo do ranking. Clique numa faixa para filtrar. O miolo do pino segue a temperatura do lead.' : 'Tamanho do círculo = população. Clique numa faixa para filtrar.'}</p>`;
    if (necAba === 'cias') { $('#g-nec').innerHTML = ''; renderPinos(lista.filter(c => !necQ || (necDe(c.id) && String(necDe(c.id).t) === necQ))); }
    else { $('#g-pin').innerHTML = ''; renderBolhas(); }
    renderNecPainel(); return;
  }
  $('#g-nec').innerHTML = '';
  $('#legenda').innerHTML = (corMapa === 'regiao'
    ? `<div class="lg-t">Regiões</div><div class="lg-row">${Object.keys(REGIOES).map(r => `<span><i class="sw rg-${REG_CLS[r]}"></i>${r}</span>`).join('')}</div>`
    : `<div class="lg-t">Estado = temperatura mais alta entre os leads</div><div class="lg-row">${TEMPS.map(([t, n]) => `<span><i class="sw" style="background:color-mix(in srgb, var(--tp-${t}) 62%, var(--surface))"></i>${n}</span>`).join('')}<span><i class="sw" style="background:var(--land)"></i>Sem lead</span></div>`)
    + `<div class="lg-t">Companhia</div>${pinos}${miolo}`;
  renderPinos(lista);
}
function renderPinos(lista) {
  const g = $('#g-pin');
  g.innerHTML = '';
  posicoes(lista);
  lista.slice().sort((a, b) => (a.id === sel) - (b.id === sel) || (a._p[1] + a._o[1]) - (b._p[1] + b._o[1])).forEach((c, i) => {
    const l = leadDe(c.id);
    const nx = corMapa === 'nec' && necDe(c.id);
    const pin = el('g', { class: `pin ${c.ini === 'Privada' ? 'priv' : 'pub'}${nx ? ' nt nt-' + nx.t : ''}${c.id === sel ? ' sel' : ''}${vencido(l) ? ' late' : ''}`, tabindex: '0', role: 'button',
      'aria-label': `${c.nome}, ${c.ini.toLowerCase()}, ${c.cidade}, ${c.uf}${l ? ', lead em ' + EST[l.estagio] : ''}. Abrir ficha.` });
    Object.assign(pin.dataset, { id: c.id, x: c._p[0], y: c._p[1], ox: c._o[0], oy: c._o[1] });
    const body = el('g', { class: 'body' });
    if (primeira && !reduz) { body.classList.add('drop'); body.style.animationDelay = Math.min(i * 9, 650) + 'ms'; }
    body.append(el('ellipse', { class: 'sh', cx: 0, cy: .3, rx: 3, ry: 1.100 }), el('path', { class: 'gota', d: PIN }));
    const m = el('circle', { class: 'miolo' + (tempAt(l) ? ' lead' : ''), cx: 0, cy: -10.600, r: 2.500 });
    if (tempAt(l)) m.style.fill = `var(--tp-${l.temp})`;
    body.append(m);
    pin.append(el('circle', { class: 'hit', cx: 0, cy: -9, r: 8 }), body);
    g.append(pin);
  });
  primeira = false;
  escala();
}
function renderBolhas() {
  const g = $('#g-nec'); g.innerHTML = '';
  RK.filter(x => (!F.uf || x.uf === F.uf) && (!F.regiao || REG_DE[x.uf] === F.regiao) && (!necQ || String(x.t) === necQ))
    .slice().sort((a, b) => b.pop - a.pop).forEach(x => {
      const [px, py] = proj(x.lat, x.lon), r = 1.500 + Math.sqrt(x.pop / 1e6) * 2.600;
      const b = el('g', { class: `nb f-${x.t}`, tabindex: '0', role: 'button', 'aria-label': `${x.m}, ${x.uf}. Necessidade ${nf(x.nota)} de 10, ${FX[x.t][0]}. Perdas ${num1(x.ipd)}%. Abrir operador.` });
      Object.assign(b.dataset, { r: x.r, x: px, y: py });
      b.append(el('circle', { cx: 0, cy: 0, r: r.toFixed(2) })); g.append(b);
    });
  escala();
}
function abreOperador(x) {
  const id = x.cias.find(i => companhia(i));
  if (id) abreFicha(id); else toast(`${x.m}: operador (${x.op}) não está no mapa.`);
}
function linhaCia(o, num) {
  const c = companhia(o.id), l = leadDe(o.id), i = CINFO[o.id];
  const det = o.est ? `${esc(c.uf)} · estimada pela média de ${o.nUF} ${o.nUF > 1 ? 'cidades' : 'cidade'} do estado no ranking` : `${esc(c.uf)} · perdas ${num1(o.ipd)}% · ${mm(o.inv)} investidos (2020–24)${i && i.inv ? ' · prevê ' + esc(i.inv) : ''}`;
  return `<li><button type="button" class="nc f-${o.t}" data-act="nec-cia" data-id="${esc(o.id)}">${num ? `<span class="pos">${o.pos}</span>` : ''}${selo(c)}<span class="nc-t"><strong>${esc(c.nome)}</strong><small>${det}</small></span>${l ? `<span class="temp t-${l.temp}">${TEMP[l.temp]}</span>` : '<span class="sem-l">sem lead</span>'}<b class="nn f-${o.t}${o.est ? ' est' : ''}">${nf(o.nota)}</b></button></li>`;
}
function renderNecPainel() {
  const box = $('#nec-painel');
  const fc = faixasCias(c => noEsc(c.uf)), mun = RK.filter(x => noEsc(x.uf)).sort((a, b) => b.nota - a.nota);
  const base = necAba === 'cias' ? fc : mun;
  const lista = necAba === 'cias' ? fc.filter(o => (!necQ || String(o.t) === necQ) && passa(companhia(o.id))) : mun.filter(x => !necQ || String(x.t) === necQ);
  const item = necAba === 'cias' ? o => linhaCia(o, true)
    : x => `<li><button type="button" class="nc f-${x.t}" data-act="nec-mun" data-r="${x.r}"><span class="pos">${x.pos}</span><span class="selo mun" aria-hidden="true">${x.uf}</span><span class="nc-t"><strong>${esc(x.m)}</strong><small>${esc(x.op)} · perdas ${num1(x.ipd)}% · ${Math.round(x.ipl)} L/lig/dia · ${mm(x.inv)} (2020–24)</small></span><b class="nn f-${x.t}">${nf(x.nota)}</b></button></li>`;
  const reg = F.uf ? REG_DE[F.uf] : F.regiao;
  box.innerHTML = `<div class="np-h"><h2>Ranking em ${esc(nomeEsc())}</h2><p class="hint">${necAba === 'cias' ? 'Companhias comparadas' : 'Municípios comparados'} só dentro ${F.uf ? 'do estado' : 'da região'}. Mais perdas e mais investimento = mais escuro.</p></div>
    <div class="esc">
      <div class="seg sm esc-r" role="group" aria-label="Região">${Object.keys(REGIOES).map(r => `<button type="button" class="${!F.uf && F.regiao === r ? 'on' : ''}" aria-pressed="${!F.uf && F.regiao === r}" data-act="nec-reg" data-v="${r}">${r}</button>`).join('')}</div>
      <label class="esc-u"><span>Estado</span><select id="nec-uf"><option value="">Toda a região ${esc(reg)}</option>${REGIOES[reg].slice().sort().map(u => `<option value="${u}" ${F.uf === u ? 'selected' : ''}>${esc(UF_NOMES[u])}</option>`).join('')}</select></label>
    </div>
    <div class="seg sm" role="group" aria-label="Ver no mapa">${[['cias', 'Companhias'], ['mun', 'Municípios']].map(([v, t]) => `<button type="button" class="${necAba === v ? 'on' : ''}" aria-pressed="${necAba === v}" data-act="nec-aba" data-v="${v}">${t}</button>`).join('')}</div>
    <div class="fx3" role="group" aria-label="Filtrar por faixa">${FORD.map(t => `<button type="button" class="fx f-${t} ${necQ === String(t) ? 'on' : ''}" aria-pressed="${necQ === String(t)}" data-act="nec-q" data-v="${necQ === String(t) ? '' : t}"><span>${FX[t][0]}</span><b>${base.filter(o => o.t === t).length}</b></button>`).join('')}</div>
    ${necQ ? `<p class="np-play"><strong>Como abordar:</strong> ${FX[necQ][1]}</p>` : ''}
    <ol class="nlist">${lista.slice(0, necTudo ? 999 : 12).map(item).join('') || `<li class="empty">${necAba === 'mun' ? `Nenhum município ${F.uf ? 'deste estado' : 'desta região'} está entre os 100 do ranking.` : 'Nada com esses filtros.'}</li>`}</ol>
    ${lista.length > 12 ? `<button class="btn sm" type="button" data-act="nec-tudo">${necTudo ? 'Mostrar só as 12 primeiras' : `Mostrar todas (${lista.length})`}</button>` : ''}
    <p class="np-f">Fonte: <a href="${esc(FONTE_RK.url)}" target="_blank" rel="noopener">${esc(FONTE_RK.nome)}</a>. Nota = metade perdas (% na distribuição e litros por ligação) + metade investimento de 2020 a 2024, em posição relativa. Faixas: terço de cima, do meio e de baixo ${F.uf ? 'do estado' : 'da região'}. Companhias sem cidade no ranking recebem a média das cidades do seu estado (marcadas como estimadas).</p>`;
}
function escala() {
  const z = Math.pow(Math.max(.1, k()), .78);
  svg.querySelectorAll('g.pin').forEach(p => {
    const d = p.dataset;
    p.setAttribute('transform', `translate(${(+d.x + d.ox * z).toFixed(2)} ${(+d.y + d.oy * z).toFixed(2)}) scale(${z.toFixed(3)})`);
  });
  svg.querySelectorAll('g.nb').forEach(b => b.setAttribute('transform', `translate(${b.dataset.x} ${b.dataset.y}) scale(${z.toFixed(3)})`));
  svg.querySelectorAll('text.lb').forEach(t => t.setAttribute('transform', `translate(${t.dataset.x} ${t.dataset.y}) scale(${Math.max(.3, z).toFixed(3)})`));
  svg.style.touchAction = k() < .98 ? 'none' : 'pan-y';
}
function limita(v) {
  const w = Math.min(VB0[2], Math.max(VB0[2] / 9, v[2])), h = w * VB0[3] / VB0[2];
  return [Math.min(VB0[2] - w * .25, Math.max(-w * .75, v[0])), Math.min(VB0[3] - h * .25, Math.max(-h * .75, v[1])), w, h];
}
function aplica(v) { vb = v; svg.setAttribute('viewBox', vb.map(n => n.toFixed(2)).join(' ')); escala(); }
function vaiPara(alvo) {
  alvo = alvo[2] >= VB0[2] ? VB0.slice() : limita(alvo);
  cancelAnimationFrame(anim);
  const de = vb.slice(), t0 = performance.now(), dur = reduz ? 0 : 480;
  const passo = t => {
    const p = dur ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - p, 3);
    aplica(de.map((n, i) => n + (alvo[i] - n) * e));
    if (p < 1) anim = requestAnimationFrame(passo);
  };
  anim = requestAnimationFrame(passo);
}
function zoom(f, cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2) { vaiPara([cx - (cx - vb[0]) * f, cy - (cy - vb[1]) * f, vb[2] * f, vb[3] * f]); }
function focaArea() {
  const ufs = F.uf ? [F.uf] : F.regiao ? REGIOES[F.regiao] : [];
  if (!ufs.length) { vaiPara(VB0.slice()); return; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  ufs.forEach(u => { const b = caixas[u]; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height); });
  const prop = VB0[2] / VB0[3], h = Math.max(120, Math.max(y1 - y0, (x1 - x0) / prop) * 1.35), w = h * prop;
  vaiPara([(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h]);
}
function pontoSvg(ev) {
  const m = svg.getScreenCTM(); if (!m) return [0, 0];
  const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
  return [p.x, p.y];
}
function eventosMapa() {
  const tip = $('#tip'), wrap = $('#map-wrap');
  let drag = null, arrastou = false;
  svg.addEventListener('pointerdown', ev => { if (ev.button) return; drag = { x: ev.clientX, y: ev.clientY, vb: vb.slice(), id: ev.pointerId }; arrastou = false; });
  svg.addEventListener('pointermove', ev => {
    if (drag && drag.id === ev.pointerId) {
      const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      if (!arrastou && Math.hypot(dx, dy) > 5 && k() < .98) { arrastou = true; svg.setPointerCapture(ev.pointerId); svg.classList.add('pan'); tip.hidden = true; }
      if (arrastou) { const r = svg.getBoundingClientRect(), s = Math.max(drag.vb[2] / r.width, drag.vb[3] / r.height); cancelAnimationFrame(anim); aplica(limita([drag.vb[0] - dx * s, drag.vb[1] - dy * s, drag.vb[2], drag.vb[3]])); }
      return;
    }
    if (ev.pointerType === 'touch') return;
    const pin = ev.target.closest && ev.target.closest('g.pin'), nb = !pin && ev.target.closest && ev.target.closest('g.nb'), uf = !pin && !nb && ev.target.closest && ev.target.closest('path.uf');
    const r = wrap.getBoundingClientRect();
    if (nb) {
      const x = RK.find(y => y.r === +nb.dataset.r);
      tip.innerHTML = `<strong>${esc(x.m)}, ${x.uf}</strong><span>${esc(x.op)} · ${x.pop.toLocaleString('pt-BR')} hab.</span><span>Perdas ${num1(x.ipd)}% · ${Math.round(x.ipl)} L/lig/dia</span><span>Investiu ${mm(x.inv)} de 2020 a 2024</span><span class="tip-fx"><i class="sw f-${x.t}"></i>Necessidade ${nf(x.nota)} · nº ${x.pos} em ${esc(nomeEsc())}</span>`;
    } else if (pin) {
      const c = companhia(pin.dataset.id), l = leadDe(c.id);
      tip.innerHTML = `<strong>${esc(c.nome)}</strong><span>${esc(c.ini)} · ${esc(c.cidade)}, ${esc(c.uf)}</span>${corMapa === 'nec' && necDe(c.id) ? `<span class="tip-fx"><i class="sw f-${necDe(c.id).t}"></i>Necessidade ${nf(necDe(c.id).nota)}${necDe(c.id).est ? ' (estimada)' : ''} · nº ${necDe(c.id).pos} em ${esc(nomeEsc())}</span>` : ''}${l ? `<span class="tip-st" style="--c:var(--tp-${l.temp})">${EST[l.estagio]}${tempAt(l) ? ' · temperatura ' + TEMP[l.temp].toLowerCase() : ''}${vencido(l) ? ' · passo vencido' : ''}</span>` : ''}`;
    } else if (uf) {
      const u = uf.dataset.uf, o = calor(filtradas())[u], m = UFM[u];
      if (corMapa === 'nec' && m && NECUFS.has(u)) tip.innerHTML = `<strong>${esc(UF_NOMES[u])}</strong><span class="tip-fx"><i class="sw" style="background:var(--uf${m.t})"></i>Necessidade média ${nf(m.nota)} · nº ${m.pos} de ${NECUFS.size} na região ${esc(REG_DE[u])}</span><span>Perdas médias ${num1(m.ipd)}% em ${m.n} ${m.n > 1 ? 'cidades' : 'cidade'} do ranking</span><span>Clique para ${F.uf === u ? 'tirar o filtro' : 'filtrar o estado'}</span>`;
      else tip.innerHTML = `<strong>${esc(UF_NOMES[u])}</strong><span>${o ? TEMPS.filter(([t]) => o[t]).map(([t, n]) => `${o[t]} ${n.toLowerCase()}`).join(' · ') : 'Sem leads ativos'}</span><span>Clique para ${F.uf === u ? 'tirar o filtro' : 'filtrar'}</span>`;
    } else { tip.hidden = true; return; }
    tip.style.left = Math.min(Math.max(ev.clientX - r.left, 120), r.width - 120) + 'px';
    tip.style.top = Math.max(ev.clientY - r.top, 70) + 'px';
    tip.hidden = false;
  });
  const solta = () => { drag = null; svg.classList.remove('pan'); };
  svg.addEventListener('pointerup', solta); svg.addEventListener('pointercancel', solta);
  svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  svg.addEventListener('click', ev => {
    if (arrastou) { arrastou = false; return; }
    if (movendo) { reg(movendo).pos = pontoSvg(ev); logar(movendo, 'dados', 'Reposicionou o pino no mapa'); const id = movendo; movendo = ''; salvar(); renderView(); toast('Pino reposicionado.'); abreFicha(id); return; }
    const pin = ev.target.closest('g.pin');
    if (pin) { abreFicha(pin.dataset.id); return; }
    const nb = ev.target.closest('g.nb');
    if (nb) { abreOperador(RK.find(y => y.r === +nb.dataset.r)); return; }
    const uf = ev.target.closest('path.uf');
    if (uf) { tip.hidden = true; aplicaFiltro('uf', F.uf === uf.dataset.uf ? '' : uf.dataset.uf); }
  });
  svg.addEventListener('keydown', ev => {
    const pin = ev.target.closest && ev.target.closest('g.pin'), nb = ev.target.closest && ev.target.closest('g.nb');
    if (pin && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); abreFicha(pin.dataset.id); }
    if (nb && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); abreOperador(RK.find(y => y.r === +nb.dataset.r)); }
  });
  svg.addEventListener('dblclick', ev => { if (ev.target.closest('g.pin')) return; const [x, y] = pontoSvg(ev); zoom(.55, x, y); });
}

/* ---------- busca no mapa ---------- */
function renderBusca() {
  const box = $('#busca-res');
  $('#legenda-box').hidden = !!F.q.trim();
  if (!F.q.trim()) { box.hidden = true; return; }
  const vis = filtradas().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  box.hidden = false;
  box.innerHTML = `<p class="br-h">${vis.length ? `${vis.length > 8 ? 'Primeiros resultados' : 'Resultados'}` : 'Nada encontrado'}</p>` + (vis.length ? vis.slice(0, 8).map(c => { const l = leadDe(c.id);
    return `<button type="button" class="br-i" data-act="ir-cia" data-id="${esc(c.id)}">${pinIco(c.ini, tempAt(l), 14)}<span><strong>${esc(c.nome)}</strong><small>${esc(c.cidade)}, ${esc(c.uf)}${l ? ' · ' + EST[l.estagio] : ''}</small></span></button>`; }).join('')
    : '<p class="br-v">Confira a grafia ou busque pela cidade ou pelo estado.</p>');
}
function focaCia(id) {
  const c = companhia(id); if (!c) return;
  const [x, y] = (S.reg[id] || {}).pos || c.pos || proj(c.lat, c.lon), w = VB0[2] / 3.200, hh = w * VB0[3] / VB0[2];
  vaiPara([x - w / 2, y - hh / 2, w, hh]);
}
function renderMover() {
  const b = $('#mover'); b.hidden = !movendo;
  if (movendo) b.innerHTML = `<span>Clique no mapa para reposicionar <strong>${esc(companhia(movendo).nome)}</strong>.</span><button class="btn sm" type="button" data-act="cancelar-mover">Cancelar</button>`;
  svg.classList.toggle('alvo', !!movendo);
}

/* ---------- ficha ---------- */
const ficha = $('#ficha');
let salvando = 0;
function abreFicha(id, aba) {
  if (!companhia(id)) return;
  if (sel && sel !== id) fechaNotas();
  sel = id; fichaAba = aba || 'resumo'; notaMudou = false;
  renderFicha();
  if (!ficha.open) ficha.showModal ? ficha.showModal() : ficha.setAttribute('open', '');
  const t = ficha.querySelector('[role="tab"][aria-selected="true"]'); if (t) t.focus();
  renderView();
}
function fechaNotas() {
  if (notaMudou && sel) { clearTimeout(salvando); logar(sel, 'nota', 'Atualizou as anotações', { junta: 'nota' }); notaMudou = false; salvar(); }
}
function fechaFicha() { if (ficha.open) ficha.close ? ficha.close() : ficha.removeAttribute('open'); }
ficha.addEventListener('click', ev => { if (ev.target === ficha) fechaFicha(); });
ficha.addEventListener('close', () => { fechaNotas(); sel = ''; salvar(); renderTudo(); });

function renderFicha() {
  const c = companhia(sel); if (!c) return;
  const ae = document.activeElement, foco = ae && ficha.contains(ae) ? ae.id : '';
  const rolagem = $('.f-body', ficha) ? $('.f-body', ficha).scrollTop : 0;
  const r = reg(sel), l = r.lead;
  const radios = (nome, lista, atual, campo, cor) => `<div class="rchips">${lista.map(([v, t]) => `<label class="rchip" ${cor ? `style="--c:var(--${cor}-${v})"` : ''}><input type="radio" name="${nome}" id="${nome}-${v}" value="${v}" data-lead="${campo}" ${atual === v ? 'checked' : ''}><span>${cor ? '<i></i>' : ''}${t}</span></label>`).join('')}</div>`;
  ficha.innerHTML = `
    <header class="f-head">
      <div class="f-tit">
        <div class="f-badges"><span class="ini ${c.ini === 'Privada' ? 'priv' : 'pub'}">${pinIco(c.ini, '', 10)}${esc(c.ini)}</span>${l ? `<span class="stp" style="--c:var(--st-${l.estagio})">${EST[l.estagio]}</span>` : ''}</div>
        <h2 id="ficha-titulo">${esc(c.nome)}</h2>
        <p class="f-sub">${esc(c.cidade)}, ${esc(c.uf)}${c.grupo ? ' · ' + esc(c.grupo) : ''}</p>
      </div>
      <button class="btn icon" type="button" data-act="fechar-ficha" aria-label="Fechar ficha">×</button>
    </header>
    <div class="f-body" id="f-panel">
      <button class="btn primary big full" type="button" data-act="rapido" data-id="${esc(sel)}">${ico('interacao', 18)} Registrar visita</button>
      ${raioX(c)}
      <section class="blk" aria-labelledby="h-temp"><h3 id="h-temp">Temperatura</h3>${radios('lt', TEMPS, l && l.temp, 'temp', 'tp')}</section>
      <section class="blk" aria-labelledby="h-prod"><h3 id="h-prod">Produto oferecido</h3>
        <div class="rchips">${PRODUTOS.map(([p, t]) => `<label class="rchip tog"><input type="checkbox" id="pr-${p}" data-prod="${p}" ${r.prod[p] ? 'checked' : ''}><span>${esc(t.replace('Soluções ', ''))}</span></label>`).join('')}</div></section>
      <section class="blk" aria-labelledby="h-atas"><div class="blk-h"><h3 id="h-atas">Atas</h3><label class="btn sm file">${ico('ata', 14)} Anexar ata<input type="file" id="ata-file" accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.heic,.csv"></label></div>
        ${r.atas.length ? `<ul class="atas">${r.atas.slice().sort((a, b) => (b.data || '').localeCompare(a.data || '')).map(a => `<li><span class="arq">${ico('ata', 14)}<span><strong>${esc(a.titulo || a.nome)}</strong><small>${dataBR(a.data)} · ${tamanho(a.tam)}</small></span></span>
          <button class="btn sm" type="button" data-act="baixar-ata" data-id="${a.id}">Baixar</button><button class="link danger sm" type="button" data-act="remover-ata" data-id="${a.id}">Remover</button></li>`).join('')}</ul>` : '<p class="empty">Nenhuma ata. Fotografe ou anexe o arquivo da reunião.</p>'}</section>
      ${l ? `<section class="blk" aria-labelledby="h-fun"><h3 id="h-fun">Funil</h3>${radios('le', ESTAGIOS, l.estagio, 'estagio', 'st')}
        <label class="col fval"><span>Valor estimado em R$ (opcional)</span><input type="text" inputmode="numeric" id="l-valor" data-lead="valor" value="${l.valor ? Number(l.valor).toLocaleString('pt-BR') : ''}" placeholder="Ex.: 500.000"></label></section>` : ''}
      <section class="blk" aria-labelledby="h-tl"><h3 id="h-tl">Histórico</h3>${timeline(logDe(sel), false)}</section>
    </div>`;
  $('.f-body', ficha).scrollTop = rolagem;
  if (foco && document.getElementById(foco)) document.getElementById(foco).focus({ preventScroll: true });
}
function raioX(c) {
  const i = CINFO[c.id] || {}, o = necDe(c.id), semDado = '<span class="sd">Sem dado público levantado</span>';
  const rU = o && rankInfo(c.id, x => x.uf === c.uf), rR = o && rankInfo(c.id, x => REG_DE[x.uf] === REG_DE[c.uf]);
  return `<section class="blk rx" aria-labelledby="h-rx">
    <div class="rx-top">${selo(c, 'lg')}<div class="rx-tt"><h3 id="h-rx">Raio-X</h3><label class="link sm file">${logos.has(c.id) ? 'Trocar logo' : 'Adicionar logo'}<input type="file" id="logo-file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></label></div>
      ${o ? `<div class="rx-n"><b class="nn lg f-${rU.t}${o.est ? ' est' : ''}">${nf(o.nota)}</b><small>${o.est ? 'nota estimada' : 'necessidade'}<br>de 0 a 10</small></div>` : ''}</div>
    <dl class="rx-dl">
      <div><dt>Municípios atendidos</dt><dd>${i.mun ? esc(i.mun) : semDado}</dd></div>
      <div><dt>Investimento previsto</dt><dd>${i.inv ? esc(i.inv) : semDado}</dd></div>
      ${o && !o.est ? `<div><dt>Perdas de água</dt><dd>${num1(o.ipd)}% · ${Math.round(o.ipl)} L por ligação/dia</dd></div><div><dt>Investiu de 2020 a 2024</dt><dd>${mm(o.inv)}</dd></div>` : ''}
      ${o && o.est ? `<div><dt>Perdas no estado</dt><dd>${num1(o.ipdUF)}% em média</dd></div>` : ''}
    </dl>
    ${o ? `<div class="rx-rk"><div class="f-${rU.t}"><span>Em ${esc(UF_NOMES[c.uf])}</span><b>nº ${rU.pos} de ${rU.n}</b>${fxChip(rU.t)}</div><div class="f-${rR.t}"><span>Na região ${esc(REG_DE[c.uf])}</span><b>nº ${rR.pos} de ${rR.n}</b>${fxChip(rR.t)}</div></div>
    <p class="rx-q"><span>${FX[rU.t][1]}</span></p><p class="hint rx-dg">${diag(o)}${o.est ? ' (média do estado)' : ''}.</p>` : ''}
    ${o && !o.est ? `<details class="rx-cid"><summary>${o.cid.length} ${o.cid.length > 1 ? 'cidades' : 'cidade'} no Ranking do Saneamento 2026</summary>
      <div class="tbl-w"><table><thead><tr><th scope="col">Município</th><th scope="col">Perdas</th><th scope="col">L/lig/dia</th><th scope="col">Invest. 2020–24</th><th scope="col">Nota</th></tr></thead>
      <tbody>${o.cid.map(x => `<tr><th scope="row">${esc(x.m)}, ${x.uf}${x.obs ? `<small>${esc(x.obs)}</small>` : ''}</th><td>${num1(x.ipd)}%</td><td>${Math.round(x.ipl)}</td><td>${mm(x.inv)}</td><td><b class="nn f-${x.t}">${nf(x.nota)}</b></td></tr>`).join('')}</tbody></table></div>
    </details>` : ''}
    ${o && o.est ? `<p class="hint">Nenhuma cidade desta companhia está entre as 100 maiores do Ranking do Saneamento 2026. A nota é estimada pela média das ${o.nUF} ${o.nUF > 1 ? 'cidades' : 'cidade'} de ${esc(c.uf)} no ranking; confirme as perdas na visita.</p>` : ''}
    ${i.url ? `<p class="hint">Municípios e investimento: <a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.fonte)}</a></p>` : ''}
  </section>`;
}
async function trocaLogo(inp) {
  const f = inp.files && inp.files[0]; if (!f) return;
  if (!/^image\//.test(f.type)) { toast('Escolha uma imagem (PNG, JPG, WEBP ou SVG).'); return; }
  if (f.size > 2 * 1048576) { toast('Imagem muito grande. Use uma de até 2 MB.'); return; }
  const id = sel; await arqPut('logo-' + id, f);
  if (logos.has(id)) URL.revokeObjectURL(logos.get(id));
  logos.set(id, URL.createObjectURL(f)); reg(id).logo = true; salvar();
  toast('Logo salvo.'); renderFicha(); renderTudo();
}
function timeline(lista, comCia) {
  if (!lista.length) return `<p class="empty">${comCia ? 'Nada registrado com esses filtros. Abra a ficha de uma companhia e registre uma interação.' : 'Nada registrado ainda. Registre a primeira interação acima.'}</p>`;
  let dia = '';
  return '<ol class="tl">' + lista.map(e => {
    const d = e.t.slice(0, 10), cab = d !== dia ? `<li class="tl-dia">${diaLabel(dia = d)}</li>` : '';
    const c = comCia ? companhia(e.cia) : null;
    return cab + `<li class="tl-i t-${e.tipo}"><span class="tl-ico">${ico(e.tipo, 14)}</span><div class="tl-c">
      <p class="tl-m"><time datetime="${esc(e.t)}">${e.tipo === 'interacao' && e.t.slice(11) === '12:00' ? 'dia' : esc(e.t.slice(11, 16))}</time>${e.canal ? ` · <b>${esc(e.canal)}</b>` : ''}${c ? ` · <button type="button" class="link" data-act="abrir" data-id="${esc(c.id)}" data-aba="rastro">${esc(c.nome)}</button>` : ''}${e.autor ? ` · ${esc(e.autor)}` : ''}${e.ex ? ' · <span class="ex">exemplo</span>' : ''}</p>
      <p class="tl-t">${esc(e.txt)}</p>
      ${e.tipo === 'interacao' && !comCia ? `<button type="button" class="link danger sm" data-act="rem-log" data-id="${esc(e.id)}">Remover</button>` : ''}</div></li>`;
  }).join('') + '</ol>';
}
function mudaLead(campo, v) {
  if (!reg(sel).lead && campo === 'temp') { criaLead(sel, { estagio: 'contato', temp: v }); salvar(); setTimeout(() => { renderFicha(); renderTudo(); }, 0); toast('Temperatura salva.'); return; }
  const l = reg(sel).lead; if (!l) return;
  if (campo === 'valor') { const n = parseValor(v); if (n === (l.valor || 0)) return; l.valor = n; logar(sel, 'lead', n ? `Valor estimado: ${moeda(n)}` : 'Removeu o valor estimado', { junta: 'valor' }); }
  else if (campo === 'estagio') { if (v === l.estagio) return; logar(sel, 'lead', `Lead movido de ${EST[l.estagio]} para ${EST[v]}`); mudaEstagio(l, v); toast(`Lead em ${EST[v]}.`); }
  else if (campo === 'temp') { if (v === l.temp) return; l.temp = v; logar(sel, 'lead', `Temperatura: ${TEMP[v]}`, { junta: 'temp' }); }
  else if (campo === 'resp') { v = v.trim(); if (v === (l.resp || '')) return; l.resp = v; logar(sel, 'lead', v ? `Responsável: ${v}` : 'Removeu o responsável', { junta: 'resp' }); }
  else if (campo === 'prox' || campo === 'proxData') {
    v = v.trim(); if (v === (l[campo] || '')) return; l[campo] = v;
    logar(sel, 'lead', l.prox ? `Próximo passo: ${l.prox}${l.proxData ? ', até ' + dataBR(l.proxData) : ''}` : 'Removeu o próximo passo', { junta: 'prox' });
  }
  salvar();
  setTimeout(() => { renderFicha(); renderTudo(); }, 0);
}
ficha.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset.prod) {
    reg(sel).prod[t.dataset.prod] = t.checked;
    logar(sel, 'produto', `${t.checked ? 'Ofereceu' : 'Retirou'} ${PROD[t.dataset.prod]}`);
    salvar(); toast(t.checked ? 'Produto marcado como oferecido.' : 'Produto desmarcado.'); renderFicha(); renderTudo();
  } else if (t.dataset.lead) mudaLead(t.dataset.lead, t.value);
  else if (t.dataset.ataCampo) { const a = reg(sel).atas.find(x => x.id === t.dataset.ata); if (a) { a[t.dataset.ataCampo] = t.value; salvar(); } }
  else if (t.name === 'int-canal') ultimoCanal = t.value;
  else if (t.id === 'ata-file') anexa(t);
  else if (t.id === 'logo-file') trocaLogo(t);
});
ficha.addEventListener('input', ev => {
  if (ev.target.id !== 'notas') return;
  reg(sel).notas = ev.target.value; notaMudou = true; $('#saved').textContent = 'Salvando…';
  clearTimeout(salvando); salvando = setTimeout(() => { salvar(); const s = $('#saved'); if (s) s.textContent = 'Salvo'; }, 400);
});
ficha.addEventListener('submit', ev => {
  if (ev.target.id !== 'f-int') return;
  ev.preventDefault();
  const txt = $('#int-txt').value.trim(), er = $('#int-err');
  if (!txt) { er.textContent = 'Descreva o que aconteceu na interação.'; er.hidden = false; $('#int-txt').focus(); return; }
  const data = $('#int-data').value || hoje(), canal = (ficha.querySelector('input[name="int-canal"]:checked') || {}).value || 'Outro';
  reg(sel).log.unshift({ id: uid('l'), t: data === hoje() ? agora() : data + 'T12:00', tipo: 'interacao', canal, txt, autor: S.autor || '' });
  salvar(); renderFicha(); renderTudo(); toast('Interação registrada no rastro.');
  const b = $('#int-txt'); if (b) b.focus();
});
ficha.addEventListener('keydown', ev => {
  if (!ev.target.matches('[role="tab"]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
  const tabs = [...ficha.querySelectorAll('[role="tab"]')], i = tabs.indexOf(ev.target);
  const j = ev.key === 'Home' ? 0 : ev.key === 'End' ? tabs.length - 1 : (i + (ev.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  ev.preventDefault(); fichaAba = tabs[j].dataset.v; renderFicha(); $('#ft-' + fichaAba).focus();
});
async function anexa(input) {
  const f = input.files[0]; input.value = '';
  if (!f) return;
  if (f.size > 25 * 1048576) { toast('Arquivo acima de 25 MB. Anexe uma versão menor.'); return; }
  const a = { id: uid('ata'), titulo: `Ata de ${dataBR(hoje())}`, data: hoje(), nome: f.name, tipo: f.type, tam: f.size };
  const persistiu = await arqPut(a.id, f);
  reg(sel).atas.push(a); logar(sel, 'ata', `Anexou a ata ${f.name}`); salvar(); renderFicha(); renderTudo();
  toast(persistiu ? 'Ata anexada.' : 'Ata anexada só nesta sessão: o navegador não permitiu guardar o arquivo.');
}
async function baixaAta(id) {
  const a = reg(sel).atas.find(x => x.id === id); if (!a) return;
  const blob = await arqGet(id);
  if (!blob) { toast('O arquivo não está neste navegador. Anexe de novo.'); return; }
  if (downloads) {
    try { await downloads.save({ filename: a.nome, data: blob }); return; }
    catch (e) { if (e && e.code === 'declined') return; if (e && e.code === 'rejected_extension') { toast('Este formato não pode ser baixado aqui.'); return; } }
  }
  try { const u = URL.createObjectURL(blob), lk = document.createElement('a'); lk.href = u; lk.download = a.nome; document.body.append(lk); lk.click(); lk.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
  catch (e) { toast('Não foi possível baixar o arquivo neste navegador.'); }
}
function mudaEstagio(l, s) { l.estagio = s; if (s === 'ganho' || s === 'perdido') l.fechadoEm = hoje(); else delete l.fechadoEm; }
function criaLead(id, v = {}) {
  reg(id).lead = { estagio: v.estagio || 'prospeccao', temp: v.temp || 'media', resp: v.resp ?? (S.autor || ''), valor: parseValor(v.valor), prox: v.prox || '', proxData: v.proxData || '', criado: hoje() };
  if (!ATIVOS.includes(reg(id).lead.estagio)) reg(id).lead.fechadoEm = hoje();
  logar(id, 'lead', `Lead criado em ${EST[reg(id).lead.estagio]}`);
  salvar();
}

/* ---------- leads ---------- */
const TICO = { alerta: '<path d="M8 2.500l6 10.500H2z"/><path d="M8 6.500v3M8 11.300v.2"/>', calor: '<path d="M8 14c-2.500 0-4-1.700-4-3.800 0-2.600 2.500-3.700 2.500-6.700 2 1.300 3 3 3 4.500.600-.400 1-1.100 1.100-1.800 1 1 1.400 2.300 1.400 3.700C12 12.300 10.500 14 8 14z"/>',
  valor: '<circle cx="8" cy="8" r="5.800"/><path d="M9.800 6c-.300-.700-1-1-1.800-1-1 0-1.800.500-1.800 1.400 0 1.900 3.700 1 3.700 3 0 .900-.800 1.500-1.900 1.500-.900 0-1.600-.400-1.900-1.100M8 4v1M8 11v1"/>',
  conversa: '<path d="M3 3.500h10v6.500H7.500L4.500 12.500V10H3z"/>', funil: '<path d="M2.500 3h11L9 8.500v4l-2 1v-5z"/>', ganho: '<path d="M3.500 8.500l3 3 6-7"/>', pessoas: '<circle cx="6" cy="5.500" r="2.200"/><path d="M2 13c.500-2.400 2-3.600 4-3.600s3.500 1.200 4 3.600"/><circle cx="11.500" cy="6.300" r="1.800"/><path d="M11 9.500c1.700 0 2.800 1.100 3.100 3.300"/>', agenda: '<rect x="2.500" y="3.500" width="11" height="10" rx="1.500"/><path d="M2.500 6.500h11M5.500 2v3M10.500 2v3"/>' };
function tiles(lista) {
  return `<div class="tiles">${lista.map(([rot, val, sub, alerta, ic]) => `<div class="tile${alerta ? ' alert' : ''}">${ic ? `<span class="t-ic" aria-hidden="true"><svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.500" stroke-linecap="round" stroke-linejoin="round">${TICO[ic]}</svg></span>` : ''}<span class="lbl">${rot}</span><span class="val">${val}</span>${sub ? `<span class="sub">${sub}</span>` : ''}</div>`).join('')}</div>`;
}
const ultimo = id => { const e = (ler(id).log || []).filter(x => x.tipo === 'interacao').sort((a, b) => b.t.localeCompare(a.t))[0]; return e ? e.t.slice(0, 10) : ''; };
function renderLeads() {
  const lista = filtradas().filter(c => leadDe(c.id));
  const total = companhias().filter(c => leadDe(c.id)).length;
  const ativos = lista.filter(c => ATIVOS.includes(leadDe(c.id).estagio));
  const valor = ativos.reduce((s, c) => s + (Number(leadDe(c.id).valor) || 0), 0);
  const venc = ativos.filter(c => vencido(leadDe(c.id))).length;
  const ganhos = lista.filter(c => leadDe(c.id).estagio === 'ganho');
  const temEx = temTeste();
  const card = c => {
    const l = leadDe(c.id), v = vencido(l);
    return `<div class="lcard" draggable="true" role="button" tabindex="0" data-act="abrir" data-id="${esc(c.id)}" aria-label="${esc(c.nome)}, ${EST[l.estagio]}. Abrir ficha.">
      <div class="lc-top">${pinIco(c.ini, tempAt(l), 13)}<strong>${esc(c.nome)}</strong></div>
      <div class="lc-sub">${esc(c.cidade)}, ${esc(c.uf)}</div>
      <div class="lc-tags">${l.temp ? `<span class="temp t-${l.temp}">${TEMP[l.temp]}</span>` : ''}${l.valor ? `<span class="val">${moedaCurta(l.valor)}</span>` : ''}${l.ex ? '<span class="ex">exemplo</span>' : ''}</div>
      ${PRODUTOS.some(([p]) => (ler(c.id).prod || {})[p]) ? `<div class="lc-prod">${PRODUTOS.filter(([p]) => ler(c.id).prod[p]).map(([, n]) => esc(n.replace('Soluções ', ''))).join(' · ')}</div>` : ''}
      ${ultimo(c.id) ? `<div class="lc-resp">Última visita: ${dataCurta(ultimo(c.id))}</div>` : ''}</div>`;
  };
  const ordena = (a, b) => { const la = leadDe(a.id), lb = leadDe(b.id); return (COL_T[lb.temp] ?? 1) - (COL_T[la.temp] ?? 1) || (lb.valor || 0) - (la.valor || 0); };
  $('#view-leads').innerHTML = `
    <div class="vh"><div><h1>Leads</h1><p class="hint">Arraste o cartão para mudar o estágio.</p></div>
      <div class="acts">${temEx ? '' : ''}<button class="btn primary" type="button" data-act="add-lead">Adicionar lead</button></div></div>
    ${!total ? `<div class="card vazio"><h2>Nenhum lead ainda</h2><p>Registre uma visita e a companhia entra no funil.</p>
      <div class="acts center"><button class="btn primary" type="button" data-act="add-lead">Adicionar lead</button><button class="btn" type="button" data-act="exemplos">Ver com exemplos</button></div></div>` : `
    <div class="board">${ESTAGIOS.map(([e, t]) => { const col = lista.filter(c => leadDe(c.id).estagio === e).sort(ordena);
      return `<section class="kcol" data-stage="${e}" style="--c:var(--st-${e})" aria-label="${t}, ${col.length} leads"><div class="kh"><h2>${t}</h2><span>${col.length}${col.length ? ' · ' + moedaCurta(col.reduce((s, c) => s + (Number(leadDe(c.id).valor) || 0), 0)) : ''}</span></div>
        ${col.map(card).join('') || '<p class="kempty">Nenhum lead</p>'}</section>`; }).join('')}</div>`}`;
}
function formAddLead() {
  const sem = companhias().filter(c => !leadDe(c.id)).sort((a, b) => a.uf.localeCompare(b.uf) || a.nome.localeCompare(b.nome, 'pt-BR'));
  abreForm({
    titulo: 'Adicionar lead', valores: { estagio: 'prospeccao', temp: 'media', resp: S.autor || '' },
    campos: [
      { nome: 'cia', rotulo: 'Companhia', tipo: 'select', vazio: 'Selecione', opcoes: sem.map(c => [c.id, `${c.uf} · ${c.nome}`]), req: true, largo: true },
      { nome: 'estagio', rotulo: 'Estágio', tipo: 'select', opcoes: ESTAGIOS },
      { nome: 'temp', rotulo: 'Temperatura', tipo: 'select', opcoes: TEMPS },
      { nome: 'resp', rotulo: 'Responsável' }, { nome: 'valor', rotulo: 'Valor estimado em R$' },
      { nome: 'prox', rotulo: 'Próximo passo', largo: true }, { nome: 'proxData', rotulo: 'Data do próximo passo', tipo: 'date' }
    ],
    salvar: v => { criaLead(v.cia, v); renderTudo(); toast('Lead criado.'); }
  });
}
/* ---------- dados de teste (fictícios) ---------- */
const temTeste = () => Object.values(S.reg).some(r => (r.lead && r.lead.ex) || (r.log || []).some(e => e.ex) || r.exMarca) || JSON.stringify(S.estr || {}).includes('"ex":true');
async function exemplos() {
  let sem = 7;
  const rnd = () => { sem = (sem * 16807) % 2147483647; return (sem - 1) / 2147483646; };
  const pick = l => l[Math.floor(rnd() * l.length)];
  const REPS = ['Marina Lopes', 'Rafael Nunes', 'Bruno Teixeira', 'Carla Dias'];
  // id, estágio, temperatura, valor, próximo passo, dias até o passo (negativo = vencido), produtos
  const LEADS = [
    ['sabesp', 'negociacao', 'alta', 1800000, 'Reunião de fechamento com a diretoria', 4, ['neoflow', 'hydroramal']],
    ['copasa', 'proposta', 'alta', 2400000, 'Retorno sobre a proposta técnica', -2, ['neoflow', 'plugplay', 'hydroramal']],
    ['embasa', 'reuniao', 'media', 500000, 'Reunião com a gerência de operações', 7, ['neoflow']],
    ['sanepar', 'contato', 'media', 750000, 'Enviar estudo de caso do Hydroramal', 2, ['hydroramal']],
    ['aguas-rio', 'prospeccao', 'baixa', 0, 'Mapear decisores', 14, []],
    ['cagece', 'contato', 'media', 430000, 'Ligar para o gerente de expansão', -1, ['plugplay']],
    ['casan', 'ganho', 'alta', 290000, '', 0, ['plugplay']],
    ['cesan', 'perdido', 'baixa', 410000, '', 0, ['neoflow']],
    ['compesa', 'reuniao', 'alta', 1350000, 'Visita técnica à ETA de Gurjaú', 0, ['neoflow', 'plugplay']],
    ['caesb', 'proposta', 'media', 680000, 'Ajustar proposta ao orçamento de 2027', 5, ['neoflow']],
    ['saneago', 'contato', 'baixa', 300000, 'Aguardar novo edital da PPP', 21, ['plugplay']],
    ['sanesul', 'prospeccao', 'media', 220000, 'Primeiro contato com engenharia', 3, []],
    ['corsan', 'negociacao', 'alta', 2100000, 'Enviar minuta do contrato', -4, ['neoflow', 'hydroramal']],
    ['cosanpa', 'prospeccao', 'baixa', 0, 'Pesquisar o plano de investimentos', 10, []],
    ['caema', 'contato', 'media', 360000, 'Agendar apresentação em São Luís', 6, ['plugplay']],
    ['cagepa', 'reuniao', 'media', 540000, 'Apresentar piloto de setorização', 1, ['neoflow']],
    ['caern', 'prospeccao', 'baixa', 180000, 'Ligar para o diretor técnico', 9, []],
    ['igua-sergipe', 'proposta', 'alta', 920000, 'Revisar escopo com a operação', -3, ['neoflow', 'hydroramal']],
    ['casal', 'contato', 'baixa', 150000, 'Enviar catálogo de produtos', 12, ['plugplay']],
    ['aguas-manaus', 'reuniao', 'media', 610000, 'Reunião com a gerência de perdas', 8, ['neoflow']],
    ['sanasa', 'negociacao', 'media', 480000, 'Validar condições de pagamento', 2, ['hydroramal']],
    ['dmae-poa', 'prospeccao', 'baixa', 0, 'Acompanhar a modelagem da concessão', 30, []],
    ['aguas-guariroba', 'contato', 'alta', 830000, 'Enviar proposta técnica', 0, ['neoflow', 'plugplay']],
    ['brk-saneatins', 'proposta', 'media', 390000, 'Cobrar retorno da proposta', -6, ['hydroramal']],
    ['aguas-cuiaba', 'ganho', 'alta', 560000, '', 0, ['neoflow']],
    ['prolagos', 'perdido', 'baixa', 270000, '', 0, ['plugplay']],
    ['cesama', 'contato', 'media', 210000, 'Visitar a sede em Juiz de Fora', 4, ['hydroramal']]
  ];
  const ROTEIRO = {
    prospeccao: [['E-mail', 'Primeiro contato por e-mail com a área de engenharia.']],
    contato: [['Ligação', 'Conversa inicial com o gerente de operações. Pediu material técnico.'], ['E-mail', 'Envio do catálogo e de estudos de caso.']],
    reuniao: [['Ligação', 'Contato com a gerência. Reunião agendada.'], ['Reunião', 'Apresentação técnica para a equipe de perdas.'], ['WhatsApp', 'Confirmou interesse em visita técnica.']],
    proposta: [['Visita', 'Visita técnica às estações e levantamento de pontos críticos.'], ['Reunião', 'Apresentação dos resultados de outros clientes.'], ['E-mail', 'Envio da proposta comercial.']],
    negociacao: [['Reunião', 'Reunião com a diretoria técnica.'], ['E-mail', 'Proposta revisada com novo prazo de entrega.'], ['Ligação', 'Negociação de condições com o suprimentos.'], ['Visita', 'Visita ao setor piloto com a equipe de campo.']],
    ganho: [['Reunião', 'Apresentação do piloto.'], ['E-mail', 'Proposta aprovada pela diretoria.'], ['Reunião', 'Assinatura do contrato.']],
    perdido: [['Reunião', 'Apresentação técnica.'], ['E-mail', 'Projeto adiado para o próximo ciclo orçamentário.']]
  };
  const ORGS = {
    sabesp: [['Helena Vasconcelos', 'Diretora de Operações', ''], ['Marcos Prado', 'Superintendente de Perdas', 0], ['Juliana Reis', 'Gerente de Engenharia', 0], ['Paulo Mendes', 'Coordenador de Setorização', 1], ['Ana Couto', 'Compradora técnica', 2]],
    copasa: [['Roberto Lima', 'Diretor Técnico', ''], ['Fernanda Alves', 'Gerente de Perdas', 0], ['Tiago Rocha', 'Gerente de Manutenção', 0], ['Lúcia Martins', 'Engenheira de Redes', 1]],
    compesa: [['Sérgio Andrade', 'Diretor de Produção', ''], ['Patrícia Gomes', 'Gerente da ETA Gurjaú', 0], ['Diego Nunes', 'Supervisor de Operação', 1]],
    corsan: [['Cláudia Ferraz', 'Diretora de Engenharia', ''], ['Eduardo Pires', 'Gerente de Projetos', 0], ['Renata Souza', 'Analista de Suprimentos', 1]],
    embasa: [['Gilberto Santos', 'Superintendente de Operações', ''], ['Camila Freitas', 'Gerente de Controle de Perdas', 0]]
  };
  const NOTAS = {
    sabesp: 'Decisão final fica com a diretoria de operações. Orçamento de perdas aprovado para o 1º semestre.',
    copasa: 'Nova gestão após a privatização quer resultado rápido em redução de perdas. Bom momento para piloto.',
    corsan: 'Suprimentos exige homologação prévia. Já enviamos a documentação.',
    compesa: 'Concessão em transição: confirmar quem decide nos blocos novos.'
  };
  const ATAS = { sabesp: [['Reunião técnica de perdas', -18]], copasa: [['Visita técnica em Belo Horizonte', -12], ['Alinhamento da proposta', -4]], compesa: [['Reunião com a produção', -9]], corsan: [['Negociação comercial', -7]] };
  const horas = ['08:40', '09:15', '10:30', '11:20', '14:05', '15:30', '16:45', '17:10'];
  for (const [id, est, temp, valor, prox, dProx, prods] of LEADS) {
    if (!companhia(id) || leadDe(id)) continue;
    const r = reg(id), resp = pick(REPS), inicio = -(20 + Math.floor(rnd() * 40));
    r.lead = { estagio: est, temp, resp, valor, prox, proxData: prox ? addDias(dProx) : '', criado: addDias(inicio), ex: true };
    if (!ATIVOS.includes(est)) r.lead.fechadoEm = addDias(-3 - Math.floor(rnd() * 20));
    r.log.push({ id: uid('l'), t: `${addDias(inicio)}T09:10`, tipo: 'lead', txt: 'Lead criado em Prospecção', autor: resp, ex: true });
    const ints = ROTEIRO[est], passo = Math.max(2, Math.floor(-inicio / (ints.length + 1)));
    ints.forEach(([canal, txt], i) => r.log.push({ id: uid('l'), t: `${addDias(inicio + passo * (i + 1))}T${pick(horas)}`, tipo: 'interacao', canal, txt, autor: resp, ex: true }));
    if (ATIVOS.includes(est) && rnd() < .7) r.log.push({ id: uid('l'), t: `${addDias(-Math.floor(rnd() * 7))}T${pick(horas)}`, tipo: 'interacao', canal: pick(['Ligação', 'WhatsApp', 'E-mail', 'Visita']), txt: pick(['Acompanhamento: cliente confirmou interesse e pediu prazo.', 'Conversa rápida com o gerente. Aguardando aprovação interna.', 'Enviados dados técnicos complementares.', 'Visita de campo para conferir medições.']), autor: resp, ex: true });
    if (est !== 'prospeccao') r.log.push({ id: uid('l'), t: `${addDias(-1 - Math.floor(rnd() * 3))}T${pick(horas)}`, tipo: 'lead', txt: `Lead movido para ${EST[est]}`, autor: resp, ex: true });
    r.log.push({ id: uid('l'), t: `${addDias(inicio + 1)}T10:00`, tipo: 'lead', txt: `Temperatura: ${TEMP[temp]}`, autor: resp, ex: true });
    if (prox) r.log.push({ id: uid('l'), t: `${addDias(-1)}T18:00`, tipo: 'lead', txt: `Próximo passo: ${prox}, até ${dataBR(addDias(dProx))}`, autor: resp, ex: true });
    const mx = r.exMarca = { prod: [], org: [], atas: [], notas: false };
    prods.forEach(p => { if (!r.prod[p]) { r.prod[p] = true; mx.prod.push(p); r.log.push({ id: uid('l'), t: `${addDias(inicio + 2)}T11:00`, tipo: 'produto', txt: `Marcou ${PROD[p]} como implementável`, autor: resp, ex: true }); } });
    if (NOTAS[id] && !r.notas) { r.notas = NOTAS[id]; mx.notas = true; }
    if (ORGS[id] && !r.org.length) {
      const ids = ORGS[id].map(() => uid('p'));
      ORGS[id].forEach(([nome, cargo, pai], i) => { r.org.push({ id: ids[i], nome, cargo, area: '', email: '', fone: '', pai: pai === '' ? '' : ids[pai], obs: '', ex: true }); mx.org.push(ids[i]); });
      r.log.push({ id: uid('l'), t: `${addDias(inicio + 3)}T15:00`, tipo: 'org', txt: `Montou o organograma com ${ids.length} pessoas`, autor: resp, ex: true });
    }
    for (const [titulo, d] of ATAS[id] || []) {
      const ata = { id: uid('ata'), titulo, data: addDias(d), nome: `ata-${slugify(titulo)}.txt`, tipo: 'text/plain', tam: 0, ex: true };
      const txt = `ATA DE REUNIÃO (DOCUMENTO FICTÍCIO DE TESTE)\n\nCompanhia: ${companhia(id).nome}\nData: ${dataBR(ata.data)}\nAssunto: ${titulo}\nResponsável GF: ${resp}\n\nParticipantes: equipe técnica da companhia e ${resp}.\n\nPontos discutidos:\n1. Situação atual das perdas e dos pontos críticos da rede.\n2. Aplicação das soluções GF no setor piloto.\n3. Prazos e próximos passos.\n\nEncaminhamentos:\n- ${prox || 'Acompanhar os resultados.'}\n`;
      const blob = new Blob([txt], { type: 'text/plain' }); ata.tam = blob.size;
      await arqPut(ata.id, blob);
      r.atas.push(ata); mx.atas.push(ata.id);
      r.log.push({ id: uid('l'), t: `${ata.data}T17:30`, tipo: 'ata', txt: `Anexou a ata ${ata.nome}`, autor: resp, ex: true });
    }
  }
  estrategiaTeste();
  try { localStorage.setItem('gf-teste-visto', '1'); } catch (e) { /* idem */ }
  salvar(); renderTudo(); toast('Dados de teste carregados.');
}
const slugify = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function removeExemplos() {
  const E = estr();
  Object.keys(E.metas).forEach(p => { if (E.metas[p].ex) delete E.metas[p]; });
  Object.values(E.planos).forEach(p => { if (p.objEx) { p.objetivo = ''; delete p.objEx; } p.acoes = (p.acoes || []).filter(a => !a.ex); });
  Object.values(E.playbook).forEach(p => { p.objecoes = (p.objecoes || []).filter(o => !o.ex); });
  Object.values(S.reg).forEach(r => {
    if (r.lead && r.lead.ex) delete r.lead;
    if (r.log) r.log = r.log.filter(e => !e.ex);
    const mx = r.exMarca;
    if (mx) {
      (mx.prod || []).forEach(p => { if (r.prod) delete r.prod[p]; });
      if (mx.notas) r.notas = '';
      if (r.org) r.org = r.org.filter(p => !(mx.org || []).includes(p.id));
      if (r.atas) { r.atas.filter(a => (mx.atas || []).includes(a.id)).forEach(a => arqDel(a.id)); r.atas = r.atas.filter(a => !(mx.atas || []).includes(a.id)); }
      delete r.exMarca;
    }
  });
  salvar(); renderTudo(); toast('Dados de teste apagados. Seus registros foram mantidos.');
}

/* ---------- rastro ---------- */
/* ---------- prioridade ---------- */
const faixaValor = v => v >= 1e6 ? 2 : v >= 4e5 ? 1 : 0;
const COL_T = { baixa: 0, media: 1, alta: 2 };
const NOMES_P = ['Radar', 'Aquecer', 'Acompanhar', 'Prioridade', 'Foco agora'];
const notaP = l => faixaValor(Number(l.valor) || 0) + (COL_T[l.temp] ?? 1);
function focoLista(lista, n) {
  return lista.map(c => ({ c, l: leadDe(c.id) })).filter(x => x.l && ATIVOS.includes(x.l.estagio))
    .map(x => ({ ...x, sc: notaP(x.l) })).sort((a, b) => b.sc - a.sc || vencido(b.l) - vencido(a.l) || (b.l.valor || 0) - (a.l.valor || 0)).slice(0, n);
}
function metaAtual() {
  const E = estr(), p = trimestre(hoje()), m = E.metas[p] || {}, [ini, fim] = triLim(p);
  const ganho = companhias().map(c => leadDe(c.id)).filter(l => l && l.estagio === 'ganho' && (l.fechadoEm || l.criado) >= ini && (l.fechadoEm || l.criado) <= fim).reduce((s, l) => s + (Number(l.valor) || 0), 0);
  return { meta: Number(m.total) || 0, ganho, rot: triRot(p) };
}

let dit = null;
if (window.claude && typeof window.claude.use === 'function') window.claude.use('dictation').then(d => { dit = d; const b = $('#qr-mic'); if (b) b.hidden = !d; }).catch(() => {});
const SUGESTOES = ['Enviar proposta', 'Agendar reunião', 'Ligar de volta', 'Visita técnica', 'Enviar material técnico'];
function recentes() {
  const out = [], vistos = new Set(), hj = hoje();
  const logs = []; companhias().forEach(c => (ler(c.id).log || []).forEach(e => { if (e.tipo === 'interacao') logs.push([e.t, c]); }));
  logs.sort((a, b) => b[0].localeCompare(a[0])).forEach(([, c]) => { if (!vistos.has(c.id)) { vistos.add(c.id); out.push(c); } });
  return out.slice(0, 6);
}
function abreRapido(id) {
  const cias = companhias().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const rot = c => `${c.nome} · ${c.uf}`, c0 = id ? companhia(id) : null, rec = c0 ? [] : recentes();
  abreDialogo(`<form class="frm qr" id="frm-qr" novalidate>
    <div class="qr-top"><h2 id="dlg-title">Registrar visita</h2><button class="btn icon" type="button" data-act="fechar-dlg" aria-label="Fechar">×</button></div>
    <label><span>Companhia</span><input type="text" id="qr-cia" list="dl-cias" value="${c0 ? esc(rot(c0)) : ''}" placeholder="Digite parte do nome" autocomplete="off"></label>
    <datalist id="dl-cias">${cias.map(c => `<option value="${esc(rot(c))}">`).join('')}</datalist>
    ${rec.length ? `<div class="qr-rec" role="group" aria-label="Companhias recentes">${rec.map(c => `<button type="button" class="chip-d" data-act="qr-cia" data-v="${esc(rot(c))}">${esc(c.nome)}</button>`).join('')}</div>` : ''}
    <div class="qr-row"><span class="qr-l">Temperatura</span><div class="rchips" role="radiogroup" aria-label="Temperatura">${TEMPS.map(([t, n]) => `<label class="rchip" style="--c:var(--tp-${t})"><input type="radio" name="qr-temp" id="qt-${t}" value="${t}"><span><i></i>${n}</span></label>`).join('')}</div></div>
    <div class="qr-txt"><label class="sr" for="qr-txt">O que aconteceu</label><textarea id="qr-txt" rows="3" placeholder="O que aconteceu na visita"></textarea>
      <button type="button" class="mic" id="qr-mic" data-act="mic" aria-label="Ditar por voz" aria-pressed="false" ${dit ? '' : 'hidden'}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.500 11a6.500 6.500 0 0 0 13 0M12 17.500V21"/></svg></button></div>
    <div class="qr-row col"><span class="qr-l">Produto oferecido</span><div class="rchips" id="qr-prods">${PRODUTOS.map(([p, n]) => `<label class="rchip tog"><input type="checkbox" name="qr-prod" id="qp-${p}" value="${p}"><span>${esc(n.replace('Soluções ', ''))}</span></label>`).join('')}</div></div>
    <label class="btn file anexo" id="qr-ata-l">${ico('ata', 16)} <span id="qr-ata-n">Anexar ata (opcional)</span><input type="file" id="qr-ata" accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.heic,.csv"></label>
    <p class="err" id="qr-err" role="alert" hidden></p>
    <button class="btn primary big full" type="submit">Salvar</button></form>`);
  const acha = () => { const v = norm($('#qr-cia').value.trim()); return v ? (cias.find(c => norm(rot(c)) === v) || cias.find(c => norm(c.nome) === v) || null) : null; };
  const info = () => {
    const c = acha(), l = c && leadDe(c.id), r = c ? ler(c.id) : {};
    const t = $('#qt-' + ((l && l.temp) || 'media')); if (t) t.checked = true;
    PRODUTOS.forEach(([p]) => { $('#qp-' + p).checked = !!(r.prod || {})[p]; });
  };
  $('#qr-cia').addEventListener('input', info); info();
  ($(c0 ? '#qr-txt' : '#qr-cia')).focus();
  $('#qr-ata').addEventListener('change', ev => { const f = ev.target.files[0]; $('#qr-ata-n').textContent = f ? f.name : 'Anexar ata (opcional)'; $('#qr-ata-l').classList.toggle('on', !!f); });
  $('#frm-qr').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (dit && dit.active()) await dit.stop();
    const er = $('#qr-err'), c = acha(), txt = $('#qr-txt').value.trim(), arq = $('#qr-ata').files[0];
    const falha = (m, el2) => { er.textContent = m; er.hidden = false; el2.focus(); };
    if (!c) return falha('Escolha a companhia: digite parte do nome e toque na sugestão.', $('#qr-cia'));
    if (!txt && !arq) return falha('Escreva o que aconteceu ou anexe a ata.', $('#qr-txt'));
    if (arq && arq.size > 25 * 1048576) return falha('A ata passa de 25 MB. Anexe uma versão menor.', $('#qr-ata'));
    const temp = (document.querySelector('input[name="qr-temp"]:checked') || {}).value || 'media';
    const r = reg(c.id);
    if (txt) r.log.unshift({ id: uid('l'), t: agora(), tipo: 'interacao', canal: 'Visita', txt, autor: S.autor || '' });
    let l = leadDe(c.id);
    if (!l) { criaLead(c.id, { estagio: 'contato', temp }); l = leadDe(c.id); }
    else if (l.temp !== temp) { l.temp = temp; logar(c.id, 'lead', `Temperatura: ${TEMP[temp]}`); }
    document.querySelectorAll('input[name="qr-prod"]:checked').forEach(i => { if (!r.prod[i.value]) { r.prod[i.value] = true; logar(c.id, 'produto', `Ofereceu ${PROD[i.value]}`); } });
    if (arq) {
      const a = { id: uid('ata'), titulo: `Ata de ${dataBR(hoje())}`, data: hoje(), nome: arq.name, tipo: arq.type, tam: arq.size };
      const ok = await arqPut(a.id, arq); r.atas.push(a); logar(c.id, 'ata', `Anexou a ata ${arq.name}`);
      if (!ok) toast('A ata ficou só nesta sessão: o navegador não permitiu guardar o arquivo.');
    }
    salvar(); fechaDialogo(); renderTudo(); if (ficha.open && sel === c.id) renderFicha(); toast(`Visita registrada em ${c.nome}.`);
  });
}
function microfone(b) {
  if (!dit) return;
  if (dit.active()) { dit.stop(); return; }
  const ta = $('#qr-txt'), base = () => ta.dataset.base ?? ta.value;
  ta.dataset.base = ta.value;
  const offP = dit.onPartial(({ text }) => { ta.value = (ta.dataset.base + (text ? (ta.dataset.base ? ' ' : '') + text : '')); });
  const offF = dit.onFinal(({ text }) => { ta.dataset.base = (ta.dataset.base + text).replace(/^\s+/, ''); ta.value = ta.dataset.base; });
  const offS = dit.onState(({ state }) => { const on = state !== 'idle'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); if (!on) { offP(); offF(); offS(); delete ta.dataset.base; } });
  dit.start({ language: 'pt-BR' }).catch(e => { if (e && e.code === 'not_granted') b.hidden = true; else if (e && e.code !== 'stopped') toast('Não foi possível ditar agora. Digite o texto.'); });
  void base;
}
/* dica dos gráficos */
window.addEventListener('scroll', () => { if (typeof ctip !== 'undefined') ctip.hidden = true; }, { passive: true });
const ctip = document.createElement('div'); ctip.className = 'tip ctip'; ctip.hidden = true; document.body.append(ctip);
document.documentElement.addEventListener('mouseleave', () => { ctip.hidden = true; });
document.addEventListener('pointerover', ev => {
  const t = ev.target.closest && ev.target.closest('[data-tip]');
  if (!t || !t.closest('#view-estrategia')) { ctip.hidden = true; return; }
  const r = t.getBoundingClientRect();
  ctip.textContent = t.dataset.tip; ctip.hidden = false;
  ctip.style.left = Math.min(Math.max(r.left + r.width / 2, 130), innerWidth - 130) + 'px'; ctip.style.top = (r.top + scrollY) + 'px';
});

/* ---------- estratégia comercial ---------- */
const PROB = { prospeccao: 10, contato: 20, reuniao: 35, proposta: 50, negociacao: 70 };
const PB_CAMPOS = [['perfil', 'Para quem vender', 'Ex.: companhias com perdas acima da média do estado e setores com pressão alta à noite.'], ['problema', 'Problema que resolve', 'Ex.: qual dor do cliente o produto ataca e como ele percebe isso no dia a dia.'],
  ['argumentos', 'Principais argumentos', 'Um argumento por linha, do mais forte para o mais fraco.'], ['perguntas', 'Perguntas para qualificar', 'Ex.: Quanto vocês perdem hoje no setor? Quem aprova o orçamento?'], ['casos', 'Casos e provas', 'Clientes, números e resultados que você pode citar.']];
let estAba = 'onde', pbProd = 'neoflow';
const trimestre = s => { const [y, m] = s.split('-').map(Number); return `${y}-T${Math.floor((m - 1) / 3) + 1}`; };
let periodo = trimestre(hoje());
const triRot = p => { const [y, q] = p.split('-T'); return `${q}º tri ${y}`; };
const triLim = p => { const [y, q] = p.split('-T').map(Number); const m0 = (q - 1) * 3 + 1; return [`${y}-${pad(m0)}-01`, isoDia(new Date(y, m0 + 2, 0))]; };
const triDesl = (p, n) => { let [y, q] = p.split('-T').map(Number); q += n; while (q > 4) { q -= 4; y++; } while (q < 1) { q += 4; y--; } return `${y}-T${q}`; };
function estr() {
  S.estr = S.estr || {}; const E = S.estr;
  E.metas = E.metas || {}; E.planos = E.planos || {}; E.playbook = E.playbook || {};
  Object.keys(REGIOES).forEach(r => { E.planos[r] = E.planos[r] || { objetivo: '', acoes: [] }; E.planos[r].acoes = E.planos[r].acoes || []; });
  PRODUTOS.forEach(([p]) => { E.playbook[p] = E.playbook[p] || {}; E.playbook[p].objecoes = E.playbook[p].objecoes || []; });
  return E;
}
function renderEstrategia() {
  const abas = [['onde', 'Ranking'], ['metas', 'Metas'], ['matriz', 'Prioridade']];
  if (!['onde', 'metas', 'matriz'].includes(estAba)) estAba = 'onde';
  const corpo = { onde: estOnde, metas: estMetas, matriz: estMatriz }[estAba]();
  $('#view-estrategia').innerHTML = `
    <div class="vh"><div><h1>Estratégia</h1></div></div>
    <div class="seg est-tabs" role="group" aria-label="Partes da estratégia">${abas.map(([v, t]) => `<button type="button" class="${estAba === v ? 'on' : ''}" aria-pressed="${estAba === v}" data-act="est-aba" data-v="${v}">${t}</button>`).join('')}</div>
    <div class="est-body">${corpo}</div>`;
}
let estEsc = 'r:Sudeste';
try { estEsc = localStorage.getItem('gf-est-esc') ?? ('r:' + (localStorage.getItem('gf-nec-reg') || 'Sudeste')); } catch (e) { /* idem */ }
function estOnde() {
  const [tp, v] = estEsc ? estEsc.split(':') : ['', ''];
  const filtro = c => !tp || (tp === 'r' ? REG_DE[c.uf] === v : c.uf === v);
  const nome = !tp ? 'Brasil' : tp === 'r' ? v : UF_NOMES[v];
  const fc = faixasCias(filtro), por = {}; FORD.forEach(t => { por[t] = fc.filter(o => o.t === t); });
  const semLead = por[1].filter(o => !leadDe(o.id));
  const opts = `<option value="">Brasil inteiro</option>${Object.keys(REGIOES).map(r => `<optgroup label="${r}"><option value="r:${r}" ${estEsc === 'r:' + r ? 'selected' : ''}>Região ${r}</option>${REGIOES[r].slice().sort().map(u => `<option value="u:${u}" ${estEsc === 'u:' + u ? 'selected' : ''}>${esc(UF_NOMES[u])}</option>`).join('')}</optgroup>`).join('')}`;
  return `
    <section class="card"><div class="blk-h"><div><h2>Ranking de necessidade · ${esc(nome)}</h2><p class="hint">${fc.length} companhias, da maior para a menor necessidade: mais perdas de água e mais investimento = mais escuro.</p></div>
      <label class="esc-u"><span>Ver</span><select id="est-esc">${opts}</select></label></div>
      <div class="quad4 q3">${FORD.map(t => `<a class="q4 f-${t}" href="#fx-${t}"><span class="q4-n">${por[t].length}</span><span class="q4-t">${FX[t][0]}</span><span class="q4-p">${FX[t][1]}</span></a>`).join('')}</div>
      ${semLead.length ? `<p class="alerta">${semLead.length} ${semLead.length > 1 ? 'companhias de mais necessidade ainda não têm lead' : 'companhia de mais necessidade ainda não tem lead'}: ${semLead.slice(0, 8).map(o => esc(companhia(o.id).nome)).join(', ')}${semLead.length > 8 ? '…' : ''}.</p>` : ''}
      ${FORD.map(t => por[t].length ? `<h3 class="fx-h f-${t}" id="fx-${t}"><i class="sw f-${t}"></i>${FX[t][0]}</h3><ol class="nlist rk">${por[t].map(o => linhaCia(o, true)).join('')}</ol>` : '').join('')}
      <p class="np-f">Fonte: <a href="${esc(FONTE_RK.url)}" target="_blank" rel="noopener">${esc(FONTE_RK.nome)}</a>. Nota = metade perdas (% na distribuição e litros por ligação) + metade investimento de 2020 a 2024, em posição relativa. Faixas: terço de cima, do meio e de baixo de ${esc(nome)}. Companhias sem cidade no ranking recebem a média das cidades do seu estado.</p>
    </section>`;
}
function estMetas() {
  const E = estr(), m = E.metas[periodo] || { total: 0, resp: {} }, [ini, fim] = triLim(periodo);
  const leads = companhias().map(c => ({ c, l: leadDe(c.id) })).filter(x => x.l);
  const ganhosP = leads.filter(x => x.l.estagio === 'ganho' && (x.l.fechadoEm || x.l.criado) >= ini && (x.l.fechadoEm || x.l.criado) <= fim);
  const abertos = leads.filter(x => ATIVOS.includes(x.l.estagio));
  const v = x => Number(x.l.valor) || 0, pond = x => v(x) * PROB[x.l.estagio] / 100;
  const ganho = ganhosP.reduce((s, x) => s + v(x), 0), ponderado = abertos.reduce((s, x) => s + pond(x), 0), prev = ganho + ponderado;
  const meta = Number(m.total) || 0;
  const escala = Math.max(meta, prev, 1) * 1.08;
  const falta = Math.max(0, meta - ganho);
  return `
    <div class="per"><button class="mbtn sm" type="button" data-act="per" data-d="-1" aria-label="Trimestre anterior">‹</button><strong>${triRot(periodo)}</strong><button class="mbtn sm" type="button" data-act="per" data-d="1" aria-label="Próximo trimestre">›</button><span class="hint">${dataBR(ini)} a ${dataBR(fim)}</span></div>
    <section class="card"><div class="blk-h"><div><h2>Meta do trimestre</h2><p class="m-res"><b>${moedaCurta(ganho)}</b> ganho · <b>${moedaCurta(prev)}</b> previsto${meta ? ` · <b class="${prev < meta ? 'late-t' : ''}">${moedaCurta(falta)}</b> faltam` : ''}</p></div><label class="meta-tot"><span>Meta do trimestre em R$</span><input type="text" inputmode="numeric" id="meta-total" data-meta="total" value="${meta ? meta.toLocaleString('pt-BR') : ''}" placeholder="Ex.: 4.500.000"></label></div>
      <div class="bullet lg" data-tip="Ganho ${moeda(ganho)} · previsão ${moeda(prev)}${meta ? ' · meta ' + moeda(meta) : ''}"><span class="b-g" style="width:${ganho / escala * 100}%"></span><span class="b-p" style="width:${(prev - ganho) / escala * 100}%"></span>${meta ? `<span class="b-m" style="left:${meta / escala * 100}%"><em>Meta</em></span>` : ''}</div>
      <div class="lg-row sm"><span><i class="sw b-g"></i>Ganho</span><span><i class="sw b-p"></i>Previsão do funil</span><span><i class="sw b-m"></i>Meta</span></div>
      <p class="hint">Previsão: ganho + funil ponderado pela chance de cada estágio.</p>
    </section>
    <section class="card"><h2>Ganhos no trimestre</h2>
      ${ganhosP.length ? `<ul class="ganhos">${ganhosP.sort((a2, b2) => v(b2) - v(a2)).map(x => `<li><button type="button" class="link" data-act="abrir" data-id="${esc(x.c.id)}">${esc(x.c.nome)}</button><span>${esc(x.c.uf)} · ${dataCurta(x.l.fechadoEm || x.l.criado)}</span><b>${moedaCurta(v(x))}</b></li>`).join('')}</ul>` : '<p class="empty">Nenhum ganho registrado neste trimestre. Mova o lead para Ganho na aba Leads.</p>'}
    </section>`;
}
const esc2 = esc;
function estMatriz() {
  const ativos = filtradas().map(c => ({ c, l: leadDe(c.id) })).filter(x => x.l && ATIVOS.includes(x.l.estagio));
  const faixa = v => v >= 1e6 ? 2 : v >= 4e5 ? 1 : 0, colT = { baixa: 0, media: 1, alta: 2 };
  const NOMES = ['Radar', 'Aquecer', 'Acompanhar', 'Prioridade', 'Foco agora'];
  const DICA = ['Contato leve, sem esforço de viagem.', 'Gerar interesse antes de investir tempo.', 'Manter o ritmo e qualificar melhor.', 'Agendar visita e avançar de estágio.', 'Visitar e fechar. Maior retorno do seu tempo.'];
  const linhasV = [[2, 'Valor alto', 'R$ 1 mi ou mais'], [1, 'Valor médio', 'R$ 400 mil a 1 mi'], [0, 'Valor baixo', 'abaixo de R$ 400 mil']];
  const cell = (fv, ct) => {
    const l = ativos.filter(x => faixa(Number(x.l.valor) || 0) === fv && colT[x.l.temp] === ct).sort((a, b) => (b.l.valor || 0) - (a.l.valor || 0));
    const sc = fv + ct;
    return `<div class="mx-c" style="--s:${sc}"><div class="mx-h"><strong>${NOMES[sc]}</strong><span>${l.length ? `${l.length} · ${moedaCurta(l.reduce((s, x) => s + (Number(x.l.valor) || 0), 0))}` : ''}</span></div>
      <div class="mx-l">${l.map(({ c, l: ld }) => `<button type="button" class="mx-i" data-act="abrir" data-id="${esc(c.id)}">${pinIco(c.ini, ld.temp, 10)}<span>${esc(c.nome)}</span><small>${moedaCurta(ld.valor)}</small></button>`).join('') || '<span class="mx-v">Nenhum</span>'}</div></div>`;
  };
  const foco = ativos.map(x => ({ ...x, sc: faixa(Number(x.l.valor) || 0) + colT[x.l.temp] })).sort((a, b) => b.sc - a.sc || (b.l.valor || 0) - (a.l.valor || 0)).slice(0, 6);
  return `<div class="mx-wrap one">
    <section class="card mx-card"><h2>Onde focar</h2>
      <div class="mx" role="table" aria-label="Matriz de prioridade">
        <div class="mx-corner"></div>${TEMPS.slice().reverse().map(([t, n]) => `<div class="mx-ch" role="columnheader"><i class="dot" style="background:var(--tp-${t})"></i>${n}</div>`).join('')}
        ${linhasV.map(([fv, n, sub]) => `<div class="mx-rh" role="rowheader"><strong>${n}</strong><small>${sub}</small></div>${[0, 1, 2].map(ct => cell(fv, ct)).join('')}`).join('')}
      </div>
      <p class="hint mx-eixo">Temperatura do lead →</p>
    </section>
</div>`;
}
function estrategiaTeste() {
  const E = estr(), p = trimestre(hoje());
  if (!E.metas[p]) E.metas[p] = { total: 4500000, resp: { 'Marina Lopes': 1200000, 'Rafael Nunes': 1200000, 'Bruno Teixeira': 1000000, 'Carla Dias': 1100000 }, ex: true };
  const PL = {
    'Norte': ['Abrir a porta em Manaus e Belém antes do próximo ciclo de investimentos.', [['Mapear decisores da Águas de Manaus', 'Bruno Teixeira', 5], ['Visitar a Cosanpa em Belém', 'Bruno Teixeira', 18]]],
    'Nordeste': ['Fechar 2 pilotos de NeoFlow entre Compesa, Cagepa e Iguá Sergipe até março.', [['Visita técnica à Compesa', 'Rafael Nunes', 0], ['Roteiro de visitas em João Pessoa, Recife e Aracaju', 'Rafael Nunes', 9], ['Enviar estudo de caso para a Cagece', 'Bruno Teixeira', -2]]],
    'Centro-Oeste': ['Aproveitar a revisão da PPP da Saneago e crescer em Campo Grande.', [['Acompanhar o novo edital da Saneago', 'Marina Lopes', 25], ['Proposta técnica para a Águas Guariroba', 'Marina Lopes', 2]]],
    'Sudeste': ['Converter Sabesp e Copasa, os dois maiores valores do funil.', [['Reunião de fechamento na Sabesp', 'Marina Lopes', 4], ['Cobrar retorno da Copasa', 'Rafael Nunes', -2], ['Apresentação para a Sanasa', 'Carla Dias', 6]]],
    'Sul': ['Expandir a partir do piloto ganho na Casan.', [['Usar o caso Casan na proposta da Corsan', 'Carla Dias', -1], ['Visita à Sanepar em Curitiba', 'Carla Dias', 11]]]
  };
  Object.entries(PL).forEach(([r, [obj, acoes]]) => {
    const pl = E.planos[r];
    if (!pl.objetivo) { pl.objetivo = obj; pl.objEx = true; }
    if (!pl.acoes.some(a => a.ex)) acoes.forEach(([txt, resp, d], i) => pl.acoes.push({ id: uid('a'), txt, resp, prazo: addDias(d), feito: i === 0 && d > 10, ex: true }));
  });
  const OBJ = [['Não temos orçamento este ano.', 'Propor um piloto pequeno em um setor e mostrar o resultado antes do próximo orçamento.'], ['Precisamos de homologação do fornecedor.', 'Levantar a lista de documentos com o suprimentos e entregar tudo na primeira visita.'], ['Já usamos outra solução.', 'Perguntar o que não funciona bem hoje e comparar em campo, no mesmo setor.']];
  PRODUTOS.forEach(([pr]) => { if (!E.playbook[pr].objecoes.some(o => o.ex)) OBJ.forEach(([o, r]) => E.playbook[pr].objecoes.push({ id: uid('o'), o, r, ex: true })); });
}

/* ---------- diálogos ---------- */
const dlg = $('#dlg');
function abreDialogo(html) { dlg.innerHTML = html; if (!dlg.open) dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', ''); }
function fechaDialogo() { if (dlg.open) dlg.close ? dlg.close() : dlg.removeAttribute('open'); }
dlg.addEventListener('click', ev => { if (ev.target === dlg) fechaDialogo(); });
function abreForm({ titulo, nota, campos, valores = {}, salvar: aoSalvar, excluir, rotuloExcluir = 'Excluir' }) {
  const campo = c => {
    const v = valores[c.nome] ?? '', id = 'c-' + c.nome, req = c.req ? 'required aria-required="true"' : '';
    let ctl;
    if (c.tipo === 'select') ctl = `<select id="${id}" name="${c.nome}" ${req}>${c.vazio ? `<option value="">${c.vazio}</option>` : ''}${c.opcoes.map(o => { const [val, txt] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(txt)}</option>`; }).join('')}</select>`;
    else if (c.tipo === 'textarea') ctl = `<textarea id="${id}" name="${c.nome}">${esc(v)}</textarea>`;
    else ctl = `<input id="${id}" name="${c.nome}" type="${c.tipo || 'text'}" value="${esc(v)}" ${req} autocomplete="off">`;
    return `<label class="${c.largo ? 'wide' : ''}"><span>${c.rotulo}${c.req ? ' (obrigatório)' : ''}</span>${ctl}</label>`;
  };
  abreDialogo(`<form class="frm" id="frm" novalidate><h2 id="dlg-title">${esc(titulo)}</h2>${nota ? `<p class="hint">${nota}</p>` : ''}
    <div class="grid">${campos.map(campo).join('')}</div><p class="err" id="frm-err" role="alert" hidden></p>
    <div class="btns">${excluir ? `<button class="btn danger" type="button" id="frm-del">${rotuloExcluir}</button>` : ''}
      <button class="btn" type="button" data-act="fechar-dlg">Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`);
  const frm = $('#frm');
  frm.addEventListener('submit', ev => {
    ev.preventDefault();
    const out = {}; let falha = null;
    campos.forEach(c => { const e = frm.elements[c.nome], v = e.value.trim(); e.classList.remove('bad'); if (c.req && !v && !falha) { falha = c; e.classList.add('bad'); } out[c.nome] = v; });
    if (falha) { const er = $('#frm-err'); er.textContent = `Preencha o campo ${falha.rotulo}.`; er.hidden = false; frm.elements[falha.nome].focus(); return; }
    fechaDialogo(); aoSalvar(out);
  });
  if (excluir) { const b = $('#frm-del'); let armado = false; b.addEventListener('click', () => { if (!armado) { armado = true; b.textContent = 'Confirmar'; b.classList.add('primary'); return; } fechaDialogo(); excluir(); }); }
  const p = frm.querySelector('input, select, textarea'); if (p) p.focus();
}
function formCompanhia(id) {
  const c = id ? companhia(id) : null;
  const tipos = [...new Set([...companhias().map(x => x.tipo), 'Outro'])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  abreForm({
    titulo: c ? 'Editar dados da companhia' : 'Adicionar companhia',
    nota: c ? '' : 'O pino entra na capital do estado. Depois, use Mover pino na ficha para ajustar.',
    valores: c || { ini: 'Pública', tipo: 'Municipal', uf: F.uf || '' },
    campos: [
      { nome: 'nome', rotulo: 'Nome da companhia', req: true, largo: true },
      { nome: 'ini', rotulo: 'Iniciativa', tipo: 'select', opcoes: ['Pública', 'Privada'], req: true },
      { nome: 'tipo', rotulo: 'Tipo de operação', tipo: 'select', opcoes: tipos },
      { nome: 'uf', rotulo: 'Estado', tipo: 'select', vazio: 'Selecione', opcoes: UFS.map(u => [u, `${u} · ${UF_NOMES[u]}`]), req: true },
      { nome: 'cidade', rotulo: 'Cidade' },
      { nome: 'grupo', rotulo: 'Grupo controlador', largo: true },
      { nome: 'nota', rotulo: 'Situação ou observação', tipo: 'textarea', largo: true }
    ],
    salvar: v => {
      if (!v.cidade) v.cidade = CAPITAIS[v.uf][0];
      if (!c) { const [, lat, lon] = CAPITAIS[v.uf]; const novo = { id: uid('c'), ...v, lat, lon }; S.custom.push(novo); logar(novo.id, 'dados', 'Adicionou a companhia ao mapa'); salvar(); renderTudo(); toast('Companhia adicionada.'); abreFicha(novo.id); return; }
      if (c.custom) Object.assign(S.custom.find(x => x.id === c.id), v); else reg(c.id).edit = v;
      if (v.uf !== c.uf) { const [, lat, lon] = CAPITAIS[v.uf]; if (c.custom) Object.assign(S.custom.find(x => x.id === c.id), { lat, lon }); else reg(c.id).pos = proj(lat, lon); }
      logar(c.id, 'dados', 'Editou os dados da companhia'); salvar(); renderTudo(); toast('Dados atualizados.'); abreFicha(c.id);
    },
    rotuloExcluir: 'Remover do mapa',
    excluir: c ? async () => {
      for (const a of ler(c.id).atas || []) await arqDel(a.id);
      if (c.custom) S.custom = S.custom.filter(x => x.id !== c.id); else S.removidas.push(c.id);
      delete S.reg[c.id]; sel = ''; fechaFicha(); salvar(); renderTudo(); toast('Companhia removida do mapa.');
    } : null
  });
}
function formAutor() {
  abreForm({
    titulo: 'Seu nome', nota: 'Assina os registros do rastro e entra como responsável dos novos leads. Fica salvo só neste navegador.',
    valores: { autor: S.autor }, campos: [{ nome: 'autor', rotulo: 'Nome', req: true, largo: true }],
    salvar: v => { S.autor = v.autor; salvar(); renderAutor(); toast(`Pronto, ${v.autor.split(' ')[0]}.`); }
  });
}
function renderAutor() { if (!$('#btn-autor')) return; const b = $('#btn-autor'); b.textContent = S.autor ? S.autor.split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() : '?'; b.title = S.autor ? `${S.autor}: trocar nome` : 'Definir seu nome'; b.setAttribute('aria-label', b.title); }
async function copiar(texto, ok) {
  try { await navigator.clipboard.writeText(texto); toast(ok); }
  catch (e) {
    abreDialogo(`<div class="frm"><h2 id="dlg-title">Copie o backup</h2><p class="hint">Selecione o texto e copie.</p><label><span class="sr">Backup</span><textarea class="io" id="io" readonly></textarea></label><div class="btns"><button class="btn" type="button" data-act="fechar-dlg">Fechar</button></div></div>`);
    $('#io').value = texto; $('#io').select();
  }
}
const b64de = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(r.error); r.readAsDataURL(blob); });
const b64para = (b64, tipo) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: tipo || 'application/octet-stream' }); };
async function montaBackup() {
  const arquivos = {};
  for (const c of Object.keys(S.reg)) if (S.reg[c].logo) {
    try { const b = await arqGet('logo-' + c); if (b) arquivos['logo-' + c] = { tipo: b.type || '', b64: await b64de(b) }; } catch (e) { /* sem logo */ }
  }
  for (const c of Object.keys(S.reg)) for (const a of (S.reg[c].atas || [])) {
    try { const b = await arqGet(a.id); if (b) arquivos[a.id] = { tipo: b.type || a.tipo || '', b64: await b64de(b) }; } catch (e) { /* ata ausente neste navegador */ }
  }
  return JSON.stringify({ app: 'mapa-gf-saneamento', versao: 2, exportadoEm: new Date().toISOString(), dados: S, arquivos });
}
async function baixarBackup() {
  const nome = `backup-mapa-gf-${hoje()}.txt`;
  let texto;
  try { texto = await montaBackup(); } catch (e) { toast('Não foi possível montar o backup.'); return; }
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  if (downloads) {
    try { await downloads.save({ filename: nome, data: blob }); toast('Backup salvo: ' + nome); return; }
    catch (e) { if (e && e.code === 'declined') return; }
  }
  try {
    const u = URL.createObjectURL(blob), lk = document.createElement('a'); lk.href = u; lk.download = nome; document.body.append(lk); lk.click(); lk.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    toast('Backup baixado: ' + nome);
  } catch (e) { copiar(texto, 'Download indisponível. Backup copiado: cole em um arquivo ' + nome); }
}
async function restauraBackup(texto) {
  const j = JSON.parse(texto);
  const dados = j && j.dados ? j.dados : j;
  if (!carregaS(dados)) return false;
  if (j && j.arquivos) for (const id of Object.keys(j.arquivos)) { try { await arqPut(id, b64para(j.arquivos[id].b64, j.arquivos[id].tipo)); } catch (e) { /* segue */ } }
  return true;
}
function formImportar() {
  abreDialogo(`<form class="frm" id="frm-imp" novalidate><h2 id="dlg-title">Importar backup</h2><p class="hint">Escolha o arquivo .txt do backup (ou cole o texto). Os registros atuais serão substituídos; as atas anexadas voltam junto.</p>
    <label class="anexo"><span>Arquivo .txt</span><input type="file" id="imp-arq" accept=".txt,text/plain,application/json"></label>
    <label><span>Ou cole o texto</span><textarea class="io" id="imp"></textarea></label><p class="err" id="imp-err" role="alert" hidden></p>
    <div class="btns"><button class="btn" type="button" data-act="fechar-dlg">Cancelar</button><button class="btn primary" type="submit">Substituir registros</button></div></form>`);
  $('#frm-imp').addEventListener('submit', async ev => {
    ev.preventDefault();
    let ok = false;
    try {
      const f = $('#imp-arq').files[0];
      const texto = f ? await f.text() : $('#imp').value;
      ok = await restauraBackup(texto);
    } catch (e) { ok = false; }
    if (!ok) { const er = $('#imp-err'); er.textContent = 'Não é um backup deste app.'; er.hidden = false; return; }
    logos.forEach(u => URL.revokeObjectURL(u)); logos.clear(); await carregaLogos();
    salvar(); fechaDialogo(); renderAutor(); renderTudo(); toast('Backup importado.');
  });
}
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  (dlg.open ? dlg : ficha.open ? ficha : document.body).append(t);
  setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 2600);
}

/* ---------- ciclo ---------- */
function renderNav() {
  const ativos = companhias().filter(c => { const l = leadDe(c.id); return l && ATIVOS.includes(l.estagio); }).length;
  $('#nb-leads').textContent = ativos || '';
}
function renderView() {
  renderNav();
  if (view === 'mapa') { renderMapa(); renderBusca(); renderMover(); }
  else if (view === 'leads') renderLeads();
  else renderEstrategia();
}
function renderFaixa() {
  const f = $('#faixa-teste'), on = temTeste();
  f.hidden = !on;
  if (on) f.innerHTML = '<span><strong>Dados de teste</strong> carregados</span><button class="link" type="button" data-act="rem-exemplos">Apagar</button>';
}
function renderTudo() { if (garanteEscopo()) focaArea(); renderFaixa(); renderFiltros(); renderView(); }
function rota() {
  const h = location.hash.replace('#', '');
  view = ['mapa', 'leads', 'estrategia'].includes(h) ? h : 'mapa';
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'view-' + view; });
  document.querySelectorAll('.tabs a').forEach(a => { const on = a.dataset.view === view; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  $('#fbar').hidden = view === 'estrategia';
  renderTudo();
}

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const d = b.dataset;
  switch (d.act) {
    case 'abrir': abreFicha(d.id, d.aba); break;
    case 'ir-cia': focaCia(d.id); abreFicha(d.id); break;
    case 'rapido': abreRapido(d.id || ''); break;
    case 'qr-cia': { const i = $('#qr-cia'); i.value = d.v; i.dispatchEvent(new Event('input')); $('#qr-txt').focus(); } break;
    case 'mic': microfone(b); break;
    case 'qr-data': { const i = $('#qr-data'); if (i) i.value = addDias(+d.d); document.querySelectorAll('.qd .chip-d').forEach(x => x.classList.toggle('on', x === b)); } break;
    case 'fechar-ficha': fechaFicha(); break;
    case 'fechar-dlg': fechaDialogo(); break;
    case 'ini': aplicaFiltro('ini', d.v); break;
    case 'painel': painel = !painel; renderFiltros(); break;
    case 'limpa-f': if (d.k === 'q') $('#busca').value = ''; aplicaFiltro(d.k, F0[d.k]); break;
    case 'limpa-tudo': F = { ...F0 }; $('#busca').value = ''; focaArea(); renderTudo(); break;
    case 'cor': corMapa = d.v; lembra('gf-cor2', d.v); renderTudo(); break;
    case 'nec-aba': necAba = d.v; renderMapa(); break;
    case 'nec-tudo': necTudo = !necTudo; renderNecPainel(); break;
    case 'nec-q': necQ = d.v; renderMapa(); break;
    case 'nec-cia': focaCia(d.id); abreFicha(d.id); break;
    case 'nec-mun': { const x = RK.find(y => y.r === +d.r); const [px, py] = proj(x.lat, x.lon), w = VB0[2] / 3.200, hh = w * VB0[3] / VB0[2]; vaiPara([px - w / 2, py - hh / 2, w, hh]); abreOperador(x); break; }
    case 'nec-reg': lembra('gf-nec-reg', d.v); F.uf = ''; necTudo = false; aplicaFiltro('regiao', d.v); break;
    case 'nova': formCompanhia(); break;
    case 'editar': formCompanhia(d.id); break;
    case 'autor': formAutor(); break;
    case 'mover': movendo = d.id; fechaFicha(); if (view !== 'mapa') location.hash = '#mapa'; renderMover(); $('#map-wrap').scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'center' }); break;
    case 'cancelar-mover': movendo = ''; renderMover(); break;
    case 'zoom-in': zoom(.6); break;
    case 'zoom-out': zoom(1 / .6); break;
    case 'zoom-reset': if (F.uf || F.regiao) { F.uf = ''; F.regiao = ''; renderTudo(); } vaiPara(VB0.slice()); break;
    case 'criar-lead': criaLead(sel); renderFicha(); renderTudo(); toast('Lead criado em Prospecção.'); break;
    case 'rem-lead':
      if (!b.dataset.armado) { b.dataset.armado = '1'; b.textContent = 'Confirmar remoção'; b.classList.add('primary'); break; }
      logar(sel, 'lead', `Removeu o lead do funil (estava em ${EST[reg(sel).lead.estagio]})`); delete reg(sel).lead; salvar(); renderFicha(); renderTudo(); toast('Lead removido. O rastro foi mantido.'); break;
    case 'rem-log':
      if (!b.dataset.armado) { b.dataset.armado = '1'; b.textContent = 'Confirmar remoção'; break; }
      reg(sel).log = reg(sel).log.filter(e => e.id !== d.id); salvar(); renderFicha(); renderTudo(); toast('Registro removido.'); break;
    case 'add-lead': formAddLead(); break;
    case 'exemplos': exemplos(); break;
    case 'rem-exemplos': removeExemplos(); break;
    case 'baixar-ata': baixaAta(d.id); break;
    case 'remover-ata':
      if (!b.dataset.armado) { b.dataset.armado = '1'; b.textContent = 'Confirmar'; break; }
      { const a = reg(sel).atas.find(x => x.id === d.id); arqDel(d.id); reg(sel).atas = reg(sel).atas.filter(x => x.id !== d.id); if (a) logar(sel, 'ata', `Removeu a ata ${a.nome}`); salvar(); renderFicha(); renderTudo(); toast('Ata removida.'); } break;
    case 'teste': exemplos(); break;
    case 'est-aba': estAba = d.v; renderEstrategia(); break;
    case 'per': periodo = triDesl(periodo, +d.d); renderEstrategia(); break;
    case 'backup': baixarBackup(); break;
    case 'importar': formImportar(); break;
  }
});
document.addEventListener('keydown', ev => {
  const t = ev.target;
  if ((ev.key === 'Enter' || ev.key === ' ') && t.matches && t.matches('div[role="button"][data-act]')) { ev.preventDefault(); t.click(); }
});
$('#busca').addEventListener('input', ev => { F.q = ev.target.value; renderTudo(); });
document.addEventListener('change', ev => {
  if (ev.target.id === 'nec-uf') { const u = ev.target.value; necTudo = false; if (u) aplicaFiltro('uf', u); else { const r = F.uf ? REG_DE[F.uf] : F.regiao; F.uf = ''; aplicaFiltro('regiao', r); } return; }
  if (ev.target.id === 'est-esc') { estEsc = ev.target.value; lembra('gf-est-esc', estEsc); renderEstrategia(); return; }
  const t = ev.target;
  if (t.dataset.f) aplicaFiltro(t.dataset.f, t.type === 'checkbox' ? t.checked : t.value);
  else if (t.dataset.meta || t.dataset.metaResp) {
    const E = estr(), m = E.metas[periodo] = E.metas[periodo] || { total: 0, resp: {} }; m.resp = m.resp || {};
    if (t.dataset.meta) m.total = parseValor(t.value); else m.resp[t.dataset.metaResp] = parseValor(t.value);
    if (!t.dataset.meta && !(Number(m.total) > 0)) m.total = Object.values(m.resp).reduce((s, x) => s + (Number(x) || 0), 0);
    delete m.ex; salvar(); setTimeout(renderEstrategia, 0); toast('Meta salva.');
  }
});

/* arrastar cartões entre estágios */
let arrastando = '';
document.addEventListener('dragstart', ev => {
  const c = ev.target.closest && ev.target.closest('.lcard'); if (!c) return;
  arrastando = c.dataset.id; c.classList.add('dragging');
  ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', arrastando);
});
document.addEventListener('dragend', () => { arrastando = ''; document.querySelectorAll('.dragging, .over').forEach(e => e.classList.remove('dragging', 'over')); });
document.addEventListener('dragover', ev => {
  const col = ev.target.closest && ev.target.closest('.kcol'); if (!col || !arrastando) return;
  ev.preventDefault();
  document.querySelectorAll('.kcol.over').forEach(e => { if (e !== col) e.classList.remove('over'); });
  col.classList.add('over');
});
document.addEventListener('drop', ev => {
  const col = ev.target.closest && ev.target.closest('.kcol'); if (!col || !arrastando) return;
  ev.preventDefault();
  const l = leadDe(arrastando), s = col.dataset.stage;
  if (l && l.estagio !== s) { logar(arrastando, 'lead', `Lead movido de ${EST[l.estagio]} para ${EST[s]}`); mudaEstagio(l, s); salvar(); renderTudo(); toast(`${companhia(arrastando).nome} em ${EST[s]}.`); }
});

try { if (!localStorage.getItem('gf-estr-teste') && Object.values(S.reg).some(r => r.lead && r.lead.ex)) { estrategiaTeste(); salvar(); } localStorage.setItem('gf-estr-teste', '1'); } catch (e) { /* idem */ }
let jaViu = false; try { jaViu = !!localStorage.getItem('gf-teste-visto'); } catch (e) { jaViu = true; }
if (!jaViu && !companhias().some(c => leadDe(c.id))) setTimeout(exemplos, 0);
window.addEventListener('hashchange', rota);
renderAutor();
if (window.matchMedia('(max-width: 640px)').matches) $('#legenda-box').open = false;
/* passar o mouse na lista destaca no mapa */
const npl = $('#nec-painel');
const tiraHl = () => svg.querySelectorAll('.hl').forEach(e => e.classList.remove('hl'));
npl.addEventListener('pointerover', ev => {
  const b = ev.target.closest && ev.target.closest('[data-act="nec-cia"],[data-act="nec-mun"]'); tiraHl(); if (!b) return;
  const alvo = b.dataset.id ? svg.querySelector(`g.pin[data-id="${CSS.escape(b.dataset.id)}"]`) : svg.querySelector(`g.nb[data-r="${b.dataset.r}"]`);
  if (alvo) { alvo.classList.add('hl'); alvo.parentNode.append(alvo); }
});
npl.addEventListener('pointerleave', tiraHl);
montaMapa();
rota();
carregaLogos().then(() => { if (logos.size) renderTudo(); });
})();
