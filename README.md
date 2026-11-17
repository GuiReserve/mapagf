# Mapa GF Saneamento

App comercial para quem visita clientes do saneamento (VRP NeoFlow, Soluções Plug & Play e Hydroramal).

**Acesso:** https://guireserve.github.io/mapagf/ — protegido por senha.

## Segurança
- O app inteiro é publicado **cifrado** (AES-256-GCM). A chave vem da senha por PBKDF2-SHA-256 com 600 000 iterações e sal aleatório. Sem a senha, o `index.html` é só uma tela de login e um bloco cifrado.
- A senha **não fica guardada** em lugar nenhum. A opção "Manter conectado" guarda neste aparelho uma chave não exportável (CryptoKey no IndexedDB) por 30 dias; "Sair (bloquear)" apaga.
- Os registros do aparelho (leads, anotações, atas, fotos, logos) e o backup .txt também ficam cifrados com a mesma chave.
- Se a senha mudar, o app pede a senha anterior uma vez para converter os dados do aparelho.

## Gerar uma nova versão
`GF_SENHA='...' node ferramentas/build.mjs <pasta-do-código> <pasta-de-saída>` gera `index.html` cifrado e copia `docx.min.js`.

Bibliotecas: [docx](https://github.com/dolanmiu/docx) (MIT), contornos dos estados [@svg-maps/brazil](https://github.com/VictorCazanave/svg-maps) (CC BY 4.0). Dados de perdas e investimento: Ranking do Saneamento 2026, Instituto Trata Brasil e GO Associados.
