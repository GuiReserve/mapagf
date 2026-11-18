// Gera a versão com login da equipe: o app inteiro vai cifrado (AES-256-GCM) com a chave da equipe,
// que só membros logados conseguem ler no Supabase (tabela chave_app).
// Uso: GF_CHAVE='...' GF_SB_URL='...' GF_SB_KEY='...' node build.mjs <pasta-fonte> <pasta-saida>
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
const [src, out] = process.argv.slice(2);
const chaveB64 = process.env.GF_CHAVE, SB_URL = process.env.GF_SB_URL, SB_KEY = process.env.GF_SB_KEY;
if (!src || !out || !chaveB64 || !SB_URL || !SB_KEY) { console.error('uso: GF_CHAVE=... GF_SB_URL=... GF_SB_KEY=... node build.mjs <fonte> <saida>'); process.exit(1); }
const ler = f => readFileSync(join(src, f), 'utf8');
const idx = ler('index.html');
const corpo = idx.slice(idx.indexOf('<body>') + 6, idx.indexOf('</body>')).replace(/<script[^>]*><\/script>\s*/g, '');
const pacote = { css: ler('styles.css'), html: corpo, js: ['map-data.js', 'data.js', 'necessidade.js', 'app.js'].map(ler) };
const b64 = u8 => Buffer.from(u8).toString('base64');
const { subtle } = globalThis.crypto;
const iv = crypto.getRandomValues(new Uint8Array(12));
const chave = await subtle.importKey('raw', Buffer.from(chaveB64, 'base64'), { name: 'AES-GCM' }, false, ['encrypt']);
const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, chave, new TextEncoder().encode(JSON.stringify(pacote))));
const P = { v: 2, iv: b64(iv), ct: b64(ct) };
const tpl = readFileSync(new URL('./loader.html', import.meta.url), 'utf8');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), tpl.replace('__PACOTE__', () => JSON.stringify(P)).replace('__SB_URL__', SB_URL).replace('__SB_KEY__', SB_KEY));
for (const f of ['docx.min.js', 'pptxgen.bundle.js', 'supabase.js']) copyFileSync(join(src, f), join(out, f));
console.log('ok', (JSON.stringify(P).length / 1024).toFixed(0) + ' KB cifrados');
