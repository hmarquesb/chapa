# 0018. Usar a empresa fictícia Rango no lugar de fontes públicas

- **Status:** Aceito
- **Data:** 2026-11-10

## Contexto

A primeira base de conhecimento (`knowledge-base/01` a `07`) era uma reescrita, com palavras próprias, do blog público para parceiros de uma empresa real de delivery. A regra de só usar números que estivessem numa página citada ("conforme <página>, consultada em…") deixou dezenas de lacunas registradas no `FONTES.md`: a taxa do repasse semanal, o prazo de aceite, o preço do entregador avulso, quem paga a entrega grátis, entre outras.

O Chapa v2 precisa de regras fechadas e coerentes: as ferramentas da onda 2 (como `simular_repasse` e `abrir_chamado`) dependem de uma tabela de taxas completa e de um processo de suporte definido, que uma reescrita de blog não oferece. Além disso, uma base que descreve as regras de uma marca real expõe o projeto a ser lido como informação oficial dessa marca.

## Decisão

- A base passa a ser a **política de parceiros da Rango**, uma empresa de delivery fictícia, inspirada no mercado brasileiro de delivery, vigente desde 01/11/2026.
- Os nomes de telas, planos e produtos são os da Rango: Painel Rango, Rango Loja, Plano Próprio, Plano Entrega, Plano Misto, Rango Chama, Rango Recomenda e Rango Ads.
- Cada documento abre com o cabeçalho "Política de parceiros da Rango, vigente desde 01/11/2026. Empresa fictícia, criada para fins de estudo."
- A base tem 11 documentos (os 7 temas anteriores, reescritos, e 4 novos: promoções e cupons, suporte e chamados, conta e segurança, pagamentos e fiscal). O `knowledge-base/README.md` lista os temas que ela não cobre de propósito.
- O assistente passa a ser "o assistente de parceiros da Rango".
- A base anterior e o `FONTES.md` vão para `docs/history/knowledge-base-v1/`.

## Alternativas consideradas

- **Manter a reescrita das fontes públicas:** as lacunas continuam, e as ferramentas da onda 2 ficam sem regras para calcular ou encaminhar.
- **Completar as lacunas com suposições sobre a empresa real:** seriam números inventados atribuídos a uma marca real, o que contraria a regra de nunca inventar números de uma fonte.

## Consequências

- A base não tem vínculo com nenhuma empresa real, e o nome de uma empresa real deixa de aparecer em `knowledge-base/`.
- Os resultados das rodadas `v1`, `v2` e `cal-*` viram histórico e não são comparáveis com a `v3`, que mede a base nova.
- A regra "conforme <página>, consultada em…" deixa de valer para a base. Os números passam a vir do `regras.yaml` ([ADR 0019](0019-regras-yaml-fonte-unica.md)).
- O [ADR 0011](0011-somente-parceiros-atuais.md) continua valendo: o assistente atende só lojas que já são parceiras, agora da Rango.
- Prompts, mensagens fixas e textos da interface passam para a Rango numa change própria (`rebrand-app-texts-to-rango`).
