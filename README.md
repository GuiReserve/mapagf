# Mapa GF Saneamento

App para quem visita clientes do saneamento: mapa do Brasil com as companhias públicas e privadas, leads por temperatura e estratégia comercial (metas e matriz de prioridade) para VRP NeoFlow, Soluções Plug & Play e Hydroramal.

**Acesse:** https://guireserve.github.io/mapagf/

## Abas
- **Mapa**: estados coloridos pela temperatura mais alta entre os leads; pinos azuis (públicas) e laranja (privadas), com o miolo na cor da temperatura.
- **Leads**: funil por etapa, arrastar e soltar.
- **Mapa › Necessidade**: os 100 maiores municípios do Ranking do Saneamento 2026, com nota de 0 a 10 (metade perdas de água, metade investimento). Todas as companhias em três faixas de cor: escuro (mais necessidade), médio e claro. A legenda filtra por faixa.
- **Estratégia**: onde ir primeiro (ranking de necessidade por companhia), meta do trimestre e matriz de prioridade.
- **Raio-X na ficha**: municípios atendidos, investimento previsto (com fonte), perdas, cidades do ranking e logo da companhia.

## Uso
- Botão **Registrar**: visita em menos de 1 minuto (temperatura, o que aconteceu, produto oferecido, ata).
- **Foto no registro**: tire ou escolha fotos ao registrar a visita; ficam na ficha da companhia.
- **Relatório em Word**: no rodapé, na aba Leads, na Estratégia ou na ficha (relatório de uma companhia). Inclui resumo do funil, ranking de necessidade e uma seção por companhia com histórico, atas e fotos.
- Os dados ficam no navegador (localStorage + IndexedDB para as atas). Use **Baixar backup (.txt)** no rodapé para salvar tudo, inclusive as atas, e **Importar backup** para restaurar em outro aparelho.

## Tecnologia
HTML, CSS e JavaScript puros, sem build. Para rodar localmente, abra `index.html` ou sirva a pasta com qualquer servidor estático.

Perdas e investimento: [Ranking do Saneamento 2026](https://tratabrasil.org.br/wp-content/uploads/2026/03/Estudo-da-GO-Associados-Ranking-do-Saneamento-de-2026.pdf), Instituto Trata Brasil e GO Associados (dados SINISA 2024).

Geração do Word: biblioteca [docx](https://github.com/dolanmiu/docx) (MIT), incluída em `docx.min.js`.

Contornos dos estados: [@svg-maps/brazil](https://github.com/VictorCazanave/svg-maps) (CC BY 4.0).
