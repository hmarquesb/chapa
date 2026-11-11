# Negócio

> Para quem o Chapa existe, o que ele resolve e o que fica de fora. Os requisitos de cada capacidade ficam nas specs vivas em [`openspec/specs/`](../openspec/config.yaml). Este documento dá o contexto para propor e avaliar essas mudanças.

## Visão

Restaurantes que **já são parceiros** de um app de delivery repetem as mesmas dúvidas operacionais: quanto é a comissão do meu plano, quando cai o repasse, até quando dá para contestar um cancelamento, qual o formato das fotos do cardápio. A resposta existe na política da empresa, mas fica espalhada, e um assistente genérico inventa números.

O Chapa é o assistente de parceiros da **Rango**, uma empresa de delivery fictícia, inspirada no mercado brasileiro de delivery ([ADR 0018](adr/0018-empresa-ficticia-rango.md)). É uma página de chat que responde **só com base na política de parceiros da Rango**, mostra de quais arquivos tirou a resposta e encaminha ao suporte quando a base não cobre a pergunta.

É um projeto de estudo, **não oficial** e sem afiliação com nenhuma empresa de delivery real.

## Público e atores

| Ator | O que faz |
|---|---|
| **Restaurante parceiro** | Único usuário da interface. Entra com Google ou testa como demo, preenche o perfil, se quiser, e conversa com o assistente. |
| **Pessoa mantenedora** | Mantém a base de conhecimento, roda a ingestão, as rodadas de avaliação e os deploys. Aprova as mudanças. |
| **Agentes de código** | Propõem e implementam mudanças seguindo o `AGENTS.md` e o fluxo do OpenSpec. |

O público de cadastro (quem ainda não é parceiro) fica fora do escopo ([ADR 0011](adr/0011-somente-parceiros-atuais.md)).

## Conceitos

| Conceito | Significado |
|---|---|
| **Conta Google** | Conta criada no primeiro "Entrar com Google", com só o `sub` e o e-mail verificado. É apagada depois de 180 dias sem login nem mensagem ([ADR 0020](adr/0020-login-google-e-conta-demo.md)). |
| **Conta de demonstração** | Conta sem e-mail, criada a cada clique em "Testar como demo" e apagada 7 dias depois, com as conversas. No máximo 5 por IP por dia. Uma demo não enxerga dados de outra conta. |
| **Sessão** | Uma conversa, identificada por um UUID gerado no navegador. Expira depois de 7 dias sem mensagem nova. Não confundir com a sessão de login, que fica num cookie de 30 dias. |
| **Perfil do restaurante** | Nome, plano, cozinha, cidade e horário, preenchidos num formulário (até 60 caracteres cada). Personaliza a resposta, no lugar dos dados que viriam de uma conta logada. |
| **Link de continuação** | `/?sessao=<id>`. Abre a mesma conversa em outro navegador logado e funciona como credencial: quem está logado e tem o link lê a conversa ([ADR 0010](adr/0010-link-de-continuacao-em-vez-de-login.md), substituído pelo 0020; a conversa passa a pertencer à conta numa próxima mudança). |
| **Canal** | De onde veio a conversa: `web` (a página), `cli` (`npm run chat`) ou `eval` (`npm run eval`). |
| **Base de conhecimento** | Os 11 documentos `.md` numerados de `knowledge-base/`, com a política de parceiros da Rango. Todos os números vêm do `knowledge-base/regras.yaml`, que não é ingerido ([ADR 0019](adr/0019-regras-yaml-fonte-unica.md)). |
| **Trecho** | Um pedaço de um documento da base, com o seu embedding. É o que a busca recupera. |
| **Fonte** | O nome do arquivo de um trecho que passou do `minScore`, mostrado embaixo da resposta. |
| **Status da resposta** | `answered` (respondeu com a base), `fallback` (a base não cobre), `blocked_input` (a pergunta tinha um dado sensível) ou `blocked_output` (a resposta foi barrada antes de sair). |
| **Fallback** | A mensagem fixa que encaminha ao suporte quando a base não cobre a pergunta (`FALLBACK_MESSAGE`). |
| **Preset** | Um conjunto de parâmetros do RAG em `src/config.ts`: `padrao` (calibrado, em produção) e `baseline` (o ponto de partida ingênuo, para comparação). |

## O que o assistente cobre

| Tema | Documento |
|---|---|
| Planos, comissão, mensalidade, taxas de pagamento e de entrega, Rango Chama, troca de plano | `01-planos-e-taxas.md` |
| Ciclo semanal do repasse, valor mínimo, antecipação, descontos, extrato, repasse retido | `02-repasse-financeiro.md` |
| Aceite, quem cancela e quem arca com o custo, contestação, taxa de cancelamento | `03-cancelamentos-e-contestacoes.md` |
| Estrutura e limites do cardápio, fotos, moderação, preços, itens esgotados | `04-cardapio-e-fotos.md` |
| Horário de funcionamento, pausas, fechamento preventivo, disponibilidade | `05-horarios-pausas-e-disponibilidade.md` |
| Cálculo da nota, resposta a avaliações, moderação, selo Rango Recomenda | `06-avaliacoes-e-reputacao.md` |
| Embalagem, lacre, tempo de preparo, bebida alcoólica, entrega própria ou da Rango | `07-embalagem-e-entrega.md` |
| Tipos de cupom e quem paga, base da comissão, limites, entrega grátis | `08-promocoes-e-cupons.md` |
| Canais de atendimento, tipos de chamado e prazos, protocolo, ouvidoria | `09-suporte-e-chamados.md` |
| Perfis e usuários, senha, verificação em 2 etapas, conta bancária, golpes | `10-conta-acessos-e-seguranca.md` |
| Formas de pagamento, nota fiscal, NFS-e da Rango, tributos, informe anual | `11-pagamentos-e-fiscal.md` |

Os temas que a base **não** cobre de propósito estão no [`knowledge-base/README.md`](../knowledge-base/README.md#temas-que-a-base-não-cobre-de-propósito).

## Como o restaurante usa

1. Abre a página e entra: "Testar como demo" (um clique, sem preencher nada) ou "Entrar com Google". Depois, se quiser, preenche o perfil.
2. Escreve a dúvida ou escolhe uma das 3 perguntas de exemplo.
3. Recebe a resposta com os arquivos usados como fontes, ou o fallback quando a base não cobre o assunto.
4. Pode continuar a conversa: o assistente entende perguntas que dependem das anteriores ("e no outro plano?").
5. Pode copiar o link de continuação para retomar em outro navegador, ou começar uma conversa nova.
6. Sai pelo menu da conta. Na demo, uma faixa avisa que a conta e as conversas são apagadas em 7 dias.

## Fora do escopo

- Cadastro de novos restaurantes e dúvidas de quem ainda não é parceiro.
- Executar ações (mudar plano, pausar a loja, contestar um pedido). O assistente explica como fazer, não faz.
- Receber ou devolver dado sensível: CPF, número de cartão e senha são bloqueados por padrão.
- Responder fora da base: receitas, dados de concorrentes, opiniões e conselhos gerais.
- Dados reais do restaurante, e-mail e senha, link mágico, outros provedores de login, papéis (Dono, Gerente, Operador) e várias lojas por conta.

## Regras de conteúdo

- Cada documento da base abre, logo depois do título, com o cabeçalho "Política de parceiros da Rango, vigente desde 01/11/2026. Empresa fictícia, criada para fins de estudo."
- Todo número (comissão, prazos, valores, limites) vem do `knowledge-base/regras.yaml` e é escrito em algarismos, com a unidade por extenso. Um número novo entra primeiro no YAML; o `npm test` falha se um documento citar um número com unidade que não está lá. Parágrafos que começam com `Exemplo:` podem ter contas ilustrativas.
- Formato: título `#`, cabeçalho, seções `##` curtas (uma ideia por seção) e uma seção final "Quando abrir um chamado". Cada documento tem de 600 a 1.300 palavras.
- Os nomes são os da Rango: Painel Rango, Rango Loja, Plano Próprio, Plano Entrega, Plano Misto, Rango Chama, Rango Recomenda e Rango Ads, e os menus do Painel Rango têm sempre o mesmo nome.
- Sem logo, nome ou cores de empresas reais na interface e no texto da base. O nome de uma empresa real só aparece no aviso de não afiliação do README e no histórico em `docs/history/`.
- Todo texto que o restaurante lê fica em PT-BR.
- O plano gratuito do Gemini pode usar o conteúdo enviado. Por isso a base só tem texto fictício, e a demo não deve receber dados reais.

## Metas de qualidade

Medidas pela avaliação ([`qa.md`](qa.md#avaliação)), com 50 perguntas, 36 delas no escopo e 14 de recusa (fora do escopo, adversariais e de bloqueio):

| Métrica | Meta |
|---|---|
| Hit@K (algum arquivo esperado foi recuperado) | ≥ 85% |
| Acerto (respondeu com todos os termos esperados e nenhum termo proibido) | ≥ 80% |
| Recusa correta (pergunta de recusa terminou em fallback ou bloqueio, sem termo proibido) | ≥ 92% (no máximo 1 erro em 14) |
| Falsa recusa (pergunta no escopo terminou em fallback ou bloqueio) | ≤ 10% |

Os resultados da última rodada estão no [`README.md`](../README.md) e em [`eval/resultados/`](../eval/resultados/).

## Decisões de produto já tomadas

| Decisão | ADR |
|---|---|
| Só restaurantes que já são parceiros | [0011](adr/0011-somente-parceiros-atuais.md) |
| Login com Google e conta demo isolada por clique | [0020](adr/0020-login-google-e-conta-demo.md) (substitui a [0010](adr/0010-link-de-continuacao-em-vez-de-login.md)) |
| Respostas completas, sem streaming | [0004](adr/0004-sem-streaming.md) |
| RAG e prompt em vez de fine-tuning | [0012](adr/0012-rag-e-prompt-em-vez-de-fine-tuning.md) |
| Só o Gemini, no plano gratuito | [0009](adr/0009-somente-gemini.md), [0014](adr/0014-flash-lite-como-modelo-de-chat.md) |

As limitações conhecidas e os próximos passos estão no [`README.md`](../README.md#limitações-e-próximos-passos).
