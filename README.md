# Mapa GF Saneamento

App comercial para quem visita clientes do saneamento (VRP NeoFlow, Soluções Plug & Play e Hydroramal).

**Acesso:** https://guireserve.github.io/mapagf/ — cada pessoa entra com a própria conta (e-mail e senha).

## Contas e dados da equipe
- Os dados ficam no Supabase (projeto `mapa-gf`, São Paulo): leads, anotações, rastro, metas, fotos, atas e documentos. A equipe inteira vê e edita a mesma base, em tempo real, em qualquer aparelho. Cada mudança fica com o e-mail de quem fez.
- **Só entra quem foi convidado.** O primeiro acesso cria a conta de administrador (exige o código de primeiro acesso, que é a senha antiga do site). Depois, qualquer membro convida outra pessoa em **Equipe**, com uma senha inicial; a pessoa troca a senha no mesmo lugar. O admin pode remover alguém.
- Regras de acesso no banco (RLS): quem não está na tabela `membros` não lê nem grava nada. Registros não podem ser apagados pelo app, só alterados; o histórico de versões não pode ser apagado.
- **Sem internet** o app continua funcionando com a cópia do aparelho e envia as mudanças quando a conexão volta. Se duas pessoas mexerem na mesma companhia ao mesmo tempo, as mudanças de cada uma são juntadas (rastro, fotos e campos diferentes não se perdem).
- Os registros que estavam salvos só no navegador, de antes das contas, sobem sozinhos para a conta da equipe no primeiro login daquele navegador.

## Segurança
- O app inteiro é publicado **cifrado** (AES-256-GCM) com a chave da equipe. Só membros logados conseguem ler essa chave no banco; sem login, o `index.html` é só uma tela de entrada e um bloco cifrado.
- A cópia local dos dados e os arquivos guardados no aparelho também ficam cifrados. "Sair da conta" apaga a chave do aparelho.
- **Histórico de versões** na conta: cópias dos registros ao abrir o app, a cada 30 minutos de uso e antes de qualquer remoção. Dá para ver leads removidos e restaurar um lead ou a versão inteira.

## Gerar uma nova versão
`GF_CHAVE='...' GF_SB_URL='...' GF_SB_KEY='...' node ferramentas/build.mjs <pasta-do-código> <pasta-de-saída>` gera o `index.html` cifrado e copia `docx.min.js`, `pptxgen.bundle.js` e `supabase.js`.

Bibliotecas: [supabase-js](https://github.com/supabase/supabase-js) (MIT), [docx](https://github.com/dolanmiu/docx) (MIT), [PptxGenJS](https://github.com/gitbrent/PptxGenJS) (MIT), contornos dos estados [@svg-maps/brazil](https://github.com/VictorCazanave/svg-maps) (CC BY 4.0). Dados de perdas e investimento: Ranking do Saneamento 2026, Instituto Trata Brasil e GO Associados.
