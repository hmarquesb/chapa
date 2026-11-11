# 0022. Identidade visual da Rango sobre os tokens do shadcn

- **Status:** Aceito
- **Data:** 2026-11-11

## Contexto

A interface usava o tema neutro padrão do shadcn, sem identidade própria, e seguia só o `prefers-color-scheme`, sem escolha manual. A Rango (empresa fictícia, [ADR 0018](0018-empresa-ficticia-rango.md)) precisa de uma paleta, fontes, forma e movimento próprios, nos dois temas, sem que cada componente carregue cores fixas.

## Decisão

- **A identidade vive nos tokens do `src/app/globals.css`**, os mesmos nomes que o shadcn já usa (`--primary`, `--background`, ...), mais quatro novos (`cinnamon`, `cinnamon-foreground`, `cinnamon-text`, `overlay`). Os componentes só usam classes semânticas (`bg-primary`, `text-muted-foreground`); trocar a paleta é editar os tokens. Os tokens ficam em hex, não em `oklch`, para o teste de contraste ler o valor sem conversão.
- **`src/lib/palette.ts` espelha os tokens de cor.** O CSS não é importável em JS, e a `/marca` e a imagem de compartilhamento precisam dos valores. O `palette.test.ts` confere que os dois arquivos têm os mesmos valores e que os pares texto/fundo passam no AA (4,5 : 1 para texto, 3 : 1 para borda de campo e foco).
- **O `design-tokens.test.ts` proíbe cor fixa** (hex, `rgb(`, `oklch(`, classes da paleta padrão do Tailwind) em `src/components` e `src/app`. Se o shadcn regenerado trouxer `bg-black/10`, o teste aponta a linha.
- **O tema é uma classe `dark` no `<html>`**, escolhida entre Claro, Escuro e Sistema e guardada no `localStorage` (`chapa-tema`). Um script inline no `<head>` (`THEME_INIT_SCRIPT`, em `src/lib/theme.ts`) aplica a classe antes da primeira pintura, em qualquer rota, e o `theme.test.ts` o executa com fakes para ele não se desencontrar da função pura `resolveTheme`.
- **Fontes:** Bricolage Grotesque (títulos) e Figtree (texto), por `next/font/google`.
- **Accent em canela clara:** o shadcn usa `bg-accent` em todo hover e foco; a canela cheia fica no token `cinnamon`, para avatar, selos e detalhes.

## Alternativas consideradas

- **Só retematizar os componentes, sem tokens testados.** Descartada: sem teste, um tom novo reprova o contraste sem ninguém ver, e cores fixas voltam aos poucos.
- **Biblioteca de componentes própria, com Storybook.** Descartada: o projeto é pequeno e o shadcn já dá a base.
- **Manter o tema padrão.** Descartada: não há identidade nem escolha de tema.
- **`next-themes`.** Descartada: seria uma dependência para ~20 linhas de lógica, e o script próprio fica testável como função pura.
- **`next/font/local`.** Alternativa se o build deixar de alcançar o Google Fonts: o `next/font/google` baixa as fontes no build, e a CI e a Vercel têm rede.

## Consequências

- Não há cor fixa em `src/components` e `src/app`; um tom novo entra no `globals.css` e no `palette.ts`, e o `npm test` diz se passa no AA.
- O `palette.ts` duplica o CSS de propósito, e o teste impede a divergência.
- A escolha de tema fica no `localStorage` do navegador, por dispositivo, e não na conta.
- O build depende de rede para baixar as fontes.
