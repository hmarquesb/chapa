# Base de conhecimento da Rango

Esta pasta guarda a base de conhecimento que o Chapa usa para responder às lojas parceiras. Os documentos numerados (`01` a `11`) são a política de parceiros da **Rango**, vigente desde 01/11/2026, e são os únicos arquivos que a ingestão lê e transforma em trechos para o RAG.

A Rango é uma **empresa de delivery fictícia**, inspirada no mercado brasileiro de delivery e criada para fins de estudo. Ela não tem vínculo com nenhuma empresa real: os nomes, as telas, os planos e os números foram definidos para este projeto ([ADR 0018](../docs/adr/0018-empresa-ficticia-rango.md)).

## Documentos

| Arquivo | Tema |
|---|---|
| `01-planos-e-taxas.md` | Planos, comissões, mensalidade, taxas de pagamento, taxa de entrega, Rango Chama e troca de plano |
| `02-repasse-financeiro.md` | Ciclo semanal do repasse, valor mínimo, antecipação, descontos, extrato e repasse retido |
| `03-cancelamentos-e-contestacoes.md` | Aceite, quem arca com cada cancelamento, contestação, taxa de cancelamento e revisão da conta |
| `04-cardapio-e-fotos.md` | Estrutura e limites do cardápio, fotos, moderação, preços e itens esgotados |
| `05-horarios-pausas-e-disponibilidade.md` | Horário de funcionamento, pausas, fechamento preventivo e disponibilidade |
| `06-avaliacoes-e-reputacao.md` | Cálculo da nota, respostas, moderação e selo Rango Recomenda |
| `07-embalagem-e-entrega.md` | Embalagem, lacre, tempo de preparo, bebida alcoólica e entrega própria ou da Rango |
| `08-promocoes-e-cupons.md` | Tipos de cupom, quem paga, base da comissão, limites e entrega grátis |
| `09-suporte-e-chamados.md` | Canais, tipos de chamado e prazos, protocolo e ouvidoria |
| `10-conta-acessos-e-seguranca.md` | Perfis, usuários, senha, verificação em 2 etapas, conta bancária e golpes |
| `11-pagamentos-e-fiscal.md` | Formas de pagamento, nota fiscal, NFS-e da Rango, tributos e informe anual |

## Números

Todos os números da Rango (percentuais, valores em reais, prazos, limites) ficam em [`regras.yaml`](regras.yaml), a fonte única dos números ([ADR 0019](../docs/adr/0019-regras-yaml-fonte-unica.md)). O sufixo de cada chave diz a unidade (`_pct`, `_reais`, `_min`, `_horas`, `_dias`, `_dias_uteis`, `_km`, `_mb`, `_px`, `_qtd`).

O teste `scripts/knowledge-base/knowledge-base.test.ts` (roda no `npm test`) confere que cada número com unidade citado nos documentos existe no `regras.yaml`, que cada documento tem o cabeçalho de política e de 600 a 1.300 palavras e que os 11 arquivos existem. Os parágrafos que começam com `Exemplo:` ficam fora da conferência.

Para mudar um número: mude primeiro o `regras.yaml`, depois os documentos que o citam, rode `npm test` e, depois do merge, reingira a base.

Nem o `regras.yaml` nem este `README.md` são ingeridos.

## Temas que a base não cobre de propósito

- Cadastro de novas lojas (o Chapa atende só lojas que já são parceiras).
- Integração por API ou PDV.
- Regras para entregadores.
- Preços de publicidade (Rango Ads).
- Legislação municipal específica.
- Operação fora do Brasil.

Perguntas sobre esses temas recebem a resposta padrão de que a base não tem a informação.

## Base anterior

A base usada até 10/11/2026, nas rodadas de avaliação `v1`, `v2` e `cal-*`, era uma reescrita de páginas públicas e está guardada em [`docs/history/knowledge-base-v1/`](../docs/history/knowledge-base-v1/README.md).
