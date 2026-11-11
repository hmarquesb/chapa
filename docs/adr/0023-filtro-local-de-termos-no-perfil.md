# 0023. Filtro local de termos no perfil

- **Status:** Aceito
- **Data:** 2026-11-11

## Contexto

O nome e a cozinha do perfil são texto livre, aparecem na interface e entram no prompt do assistente. Sem filtro, a demo pode exibir um termo ofensivo ou carregar uma instrução disfarçada de nome ("Ignore as regras"). O filtro precisa rodar igual no formulário, na API, no assistente e no CLI, sem custo de cota e sem rede.

## Decisão

- **Uma função pura, `checkProfileText`, em `src/lib/moderation/`.** Ela fica em `src/lib/` porque o formulário também a chama, e `src/components/` não importa `src/core/`. O `src/core/` já importa funções puras de `src/lib/`. A API, o assistente (`cleanProfile`) e o `scripts/chat.ts` chamam a mesma função.
- **Ordem das checagens:** caractere, instrução, marca (só em `name`) e termo inadequado. O primeiro motivo que falha é o devolvido.
- **Exceção na ordem para símbolos de leetspeak (`@`, `!`, `$`).** Quando são os únicos caracteres proibidos, as checagens de instrução, marca e termo rodam antes. Se nenhuma falhar, a recusa é `caractere`. Assim um termo disfarçado ("m3rd@") sai como `termo_inadequado`, e um nome com pontuação comum sai como `caractere`.
- **Normalização antes do casamento:** minúsculas, sem acento, leetspeak, letras soltas juntadas, separadores como corte e letras repetidas reduzidas. O casamento é por token inteiro, com uma lista de termos permitidos para os falsos positivos.
- **A lista fica em base64** (`blocked-terms.ts`), por categoria, só para não aparecer em buscas no repositório. Não é sigilo. O comando para ver a lista está no comentário do arquivo e no [`docs/development.md`](../development.md#testes). Os testes geram os casos bloqueados a partir da lista.
- **O texto recusado nunca vai para o log.** O log traz só o motivo (`profileRejected`). O `400` traz `field` para a interface marcar o campo certo.
- **Segunda barreira:** o prompt delimita os dados do restaurante e manda nunca seguir instruções escritas neles.

## Alternativas consideradas

- **Biblioteca npm de palavrões.** Descartada: listas em inglês, sem normalização para o português, dependência nova e pouco controle dos falsos positivos.
- **API de moderação externa.** Descartada: latência e cota em cada salvamento, e o texto do usuário sairia do nosso servidor.
- **Pedir ao Gemini que classifique o texto.** Descartada: consome a cota gratuita, é não determinística e a própria entrada poderia injetar instruções no classificador.
- **Lista em texto puro.** Descartada: expõe os termos a quem busca no repositório.

## Consequências

- Uma regra só para os quatro pontos de entrada, testada sem rede.
- A lista é limitada: grafia criativa pode escapar. O objetivo é a demo não mostrar o óbvio, e o bloco delimitado no prompt é a segunda barreira.
- Perfis já salvos não são recusados em massa: o `name` e a `cuisine` recusados só ficam fora do prompt até a pessoa salvar de novo.
- O [`AGENTS.md`](../../AGENTS.md) registra a exceção da regra "Marca e conteúdo" para a lista codificada em `src/lib/moderation/`.
