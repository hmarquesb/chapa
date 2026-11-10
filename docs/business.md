# Negócio

> Para quem o Chapa existe, o que ele resolve e o que fica de fora. Os requisitos de cada capacidade ficam nas specs vivas em [`openspec/specs/`](../openspec/config.yaml). Este documento dá o contexto para propor e avaliar essas mudanças.

## Visão

Restaurantes que **já são parceiros** de um app de delivery repetem as mesmas dúvidas operacionais: quanto é a comissão do meu plano, quando cai o repasse, até quando dá para contestar um cancelamento, qual o formato das fotos do cardápio. A resposta existe em páginas públicas, mas fica espalhada, e um assistente genérico inventa números.

O Chapa é uma página de chat que responde **só com base na sua própria base de conhecimento**, mostra de quais arquivos tirou a resposta e encaminha ao suporte quando a base não cobre a pergunta.

É um projeto de estudo, **não oficial** e sem afiliação com nenhuma empresa de delivery.

## Público e atores

| Ator | O que faz |
|---|---|
| **Restaurante parceiro** | Único usuário da interface. Preenche o perfil, se quiser, e conversa com o assistente. Não tem login. |
| **Pessoa mantenedora** | Mantém a base de conhecimento, roda a ingestão, as rodadas de avaliação e os deploys. Aprova as mudanças. |
| **Agentes de código** | Propõem e implementam mudanças seguindo o `AGENTS.md` e o fluxo do OpenSpec. |

O público de cadastro (quem ainda não é parceiro) fica fora do escopo ([ADR 0011](adr/0011-somente-parceiros-atuais.md)).

## Conceitos

| Conceito | Significado |
|---|---|
| **Sessão** | Uma conversa anônima, identificada por um UUID gerado no navegador. Expira depois de 7 dias sem mensagem nova. |
| **Perfil do restaurante** | Nome, plano, cozinha, cidade e horário, preenchidos num formulário (até 60 caracteres cada). Personaliza a resposta, no lugar dos dados que viriam de uma conta logada. |
| **Link de continuação** | `/?sessao=<id>`. Abre a mesma conversa em outro navegador e funciona como credencial: quem tem o link lê a conversa ([ADR 0010](adr/0010-link-de-continuacao-em-vez-de-login.md)). |
| **Canal** | De onde veio a conversa: `web` (a página), `cli` (`npm run chat`) ou `eval` (`npm run eval`). |
| **Base de conhecimento** | Os documentos `.md` de `knowledge-base/`, reescritos com palavras próprias a partir de páginas públicas. |
| **Trecho** | Um pedaço de um documento da base, com o seu embedding. É o que a busca recupera. |
| **Fonte** | O nome do arquivo de um trecho que passou do `minScore`, mostrado embaixo da resposta. |
| **Status da resposta** | `answered` (respondeu com a base), `fallback` (a base não cobre), `blocked_input` (a pergunta tinha um dado sensível) ou `blocked_output` (a resposta foi barrada antes de sair). |
| **Fallback** | A mensagem fixa que encaminha ao suporte quando a base não cobre a pergunta (`FALLBACK_MESSAGE`). |
| **Preset** | Um conjunto de parâmetros do RAG em `src/config.ts`: `padrao` (calibrado, em produção) e `baseline` (o ponto de partida ingênuo, para comparação). |

## O que o assistente cobre

| Tema | Documento |
|---|---|
| Planos, comissão, mensalidade, taxa de entrega e de pagamento online, troca de plano | `01-planos-e-taxas.md` |
| Ciclo e prazos do repasse, antecipação, extrato, descontos, repasse atrasado | `02-repasse-financeiro.md` |
| Quem cancela, quem arca com o custo, como e até quando contestar | `03-cancelamentos-e-contestacoes.md` |
| Estrutura do cardápio, fotos, complementos, itens esgotados, preços | `04-cardapio-e-fotos.md` |
| Abrir e fechar a loja, pausas, fechamento automático, visibilidade | `05-horarios-pausas-e-disponibilidade.md` |
| Cálculo da nota, resposta a avaliações, o que derruba e como melhorar | `06-avaliacoes-e-reputacao.md` |
| Embalagem, lacre, tempo de preparo, itens delicados | `07-embalagem-e-entrega.md` |

O que as fontes **não** respondem fica registrado em [`knowledge-base/FONTES.md`](../knowledge-base/FONTES.md), na coluna "Lacunas".

## Como o restaurante usa

1. Abre a página e, se quiser, preenche o perfil.
2. Escreve a dúvida ou escolhe uma das 3 perguntas de exemplo.
3. Recebe a resposta com os arquivos usados como fontes, ou o fallback quando a base não cobre o assunto.
4. Pode continuar a conversa: o assistente entende perguntas que dependem das anteriores ("e no outro plano?").
5. Pode copiar o link de continuação para retomar em outro navegador, ou começar uma conversa nova.

## Fora do escopo

- Cadastro de novos restaurantes e dúvidas de quem ainda não é parceiro.
- Executar ações (mudar plano, pausar a loja, contestar um pedido). O assistente explica como fazer, não faz.
- Receber ou devolver dado sensível: CPF, número de cartão e senha são bloqueados por padrão.
- Responder fora da base: receitas, dados de concorrentes, opiniões e conselhos gerais.
- Login, contas e dados reais do restaurante.

## Regras de conteúdo

- Números (comissão, prazos, valores) só entram na base se estiverem na fonte, no formato "conforme <página>, consultada em DD/MM/AAAA". Sem fonte, o texto fica genérico.
- Sem logo, nome ou cores de empresas reais na interface e no texto da base. O nome de uma empresa real só aparece nas URLs de fonte e no aviso de não afiliação.
- Todo texto que o restaurante lê fica em PT-BR.
- O plano gratuito do Gemini pode usar o conteúdo enviado. Por isso a base só tem texto público, e a demo não deve receber dados reais.

## Metas de qualidade

Medidas pela avaliação ([`qa.md`](qa.md#avaliação)), com 20 perguntas, 14 delas no escopo:

| Métrica | Meta |
|---|---|
| Hit@K (algum arquivo esperado foi recuperado) | ≥ 85% |
| Acerto (respondeu com todos os termos esperados) | ≥ 80% |
| Recusa correta (fora do escopo ou bloqueio terminou em fallback ou bloqueio) | 100% |
| Falsa recusa (pergunta no escopo terminou em fallback ou bloqueio) | ≤ 10% |

Os resultados da última rodada estão no [`README.md`](../README.md) e em [`eval/resultados/`](../eval/resultados/).

## Decisões de produto já tomadas

| Decisão | ADR |
|---|---|
| Só restaurantes que já são parceiros | [0011](adr/0011-somente-parceiros-atuais.md) |
| Link de continuação em vez de login | [0010](adr/0010-link-de-continuacao-em-vez-de-login.md) |
| Respostas completas, sem streaming | [0004](adr/0004-sem-streaming.md) |
| RAG e prompt em vez de fine-tuning | [0012](adr/0012-rag-e-prompt-em-vez-de-fine-tuning.md) |
| Só o Gemini, no plano gratuito | [0009](adr/0009-somente-gemini.md), [0014](adr/0014-flash-lite-como-modelo-de-chat.md) |

As limitações conhecidas e os próximos passos estão no [`README.md`](../README.md#limitações-e-próximos-passos).
