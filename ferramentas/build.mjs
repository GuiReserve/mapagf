// Gera a versão protegida por senha: o app inteiro vai cifrado (AES-256-GCM, chave PBKDF2-SHA-256).
// Uso: GF_SENHA='...' node build.mjs <pasta-fonte> <pasta-saida>
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
const [src, out] = process.argv.slice(2);
const senha = process.env.GF_SENHA;
if (!src || !out || !senha) { console.error('uso: GF_SENHA=... node build.mjs <fonte> <saida>'); process.exit(1); }
const IT = 600000;
const ler = f => readFileSync(join(src, f), 'utf8');
const idx = ler('index.html');
const corpo = idx.slice(idx.indexOf('<body>') + 6, idx.indexOf('</body>')).replace(/<script[^>]*><\/script>\s*/g, '');
const pacote = { css: ler('styles.css'), html: corpo, js: ['map-data.js', 'data.js', 'necessidade.js', 'app.js'].map(ler) };
const b64 = u8 => Buffer.from(u8).toString('base64');
const { subtle } = globalThis.crypto;
const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const base = await subtle.importKey('raw', new TextEncoder().encode(senha.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
const chave = await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: IT }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, chave, new TextEncoder().encode(JSON.stringify(pacote))));
const P = { v: 1, s: b64(sal), iv: b64(iv), it: IT, ct: b64(ct) };
const tpl = readFileSync(new URL('./loader.html', import.meta.url), 'utf8');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), tpl.replace('__PACOTE__', JSON.stringify(P)));
for (const f of ['docx.min.js', 'pptxgen.bundle.js']) copyFileSync(join(src, f), join(out, f));
console.log('ok', (JSON.stringify(P).length / 1024).toFixed(0) + ' KB cifrados');
