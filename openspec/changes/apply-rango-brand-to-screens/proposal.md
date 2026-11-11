# Proposal

## Why

Com os tokens da change 1 (`add-rango-design-tokens`), as telas já usam as cores, as fontes e os cantos da Rango, mas a marca ainda não aparece: não há logo, o Chapa não tem rosto, o "Digitando…" é o mesmo de qualquer chat e o rodapé não diz que a Rango é fictícia. Esta é a **change 2 de 3** da identidade visual. Ela põe a marca nas telas e cria o script de screenshots que leva as telas, nos dois temas e em dois tamanhos, para a revisão do PR. **Depende da change 1 mergeada e arquivada**, e os deltas foram escritos sobre o texto que ela deixa.

## What Changes

- **Componentes de marca** em `src/components/brand/`:
  - `RangoLogo`: a palavra **"rango."** em minúsculas, Bricolage Grotesque 800, em vinho (rosa-vinho no escuro), com o **ponto final em canela**. É texto estilizado, com o nome acessível "Rango".
  - `ChapaAvatar`: um círculo canela com o **ícone do Chapa**, em ameixa. O ícone é um desenho próprio: uma **espátula de chapa** inclinada, com a lâmina de frente reta, duas fendas e o cabo arredondado, em traço de 2 px num quadro de 24 px, no estilo do Lucide, mas sem copiar nenhum ícone. A geometria fica num módulo próprio, para a change 3 exportar o mesmo desenho em SVG.
  - `ThinkingIndicator`: o avatar com **três pontos pulsando** no lugar do "Digitando…", com o texto "Chapa está pensando…" para leitores de tela e, com movimento reduzido, no lugar dos pontos.
  - `SiteFooter`: "Rango é uma empresa fictícia, criada para um projeto de estudo, sem afiliação com nenhuma empresa de delivery." e o link "Privacidade", em todas as telas. No chat, ele mantém o aviso de retenção e de dados pessoais.
- **Telas retematizadas**, sem mudar comportamento: entrada (logo grande, aviso de privacidade num cartão suave, rodapé), cabeçalho do chat com o logo, respostas com o avatar e o cartão de fontes com selos em canela clara, **bolha do usuário em linho escuro** (não mais em vinho cheio), campo de mensagem arredondado, lista de conversas, menu da conta, faixa de demo em canela clara, resumo e formulário de perfil, avisos de fallback e bloqueio (com ícone e texto, como hoje), diálogos de excluir e perguntas de exemplo.
- **Microanimações:** a mensagem nova entra com fade e leve subida (~200 ms), e os pontos de "pensando" pulsam num ciclo de ~1,2 s. Com `prefers-reduced-motion`, nada se move.
- **Na tela de entrada, "Testar como demo" continua como a ação principal** (vinho), como diz a spec `auth`, e "Entrar com Google" fica como secundária. O PRD sugeria o Google no vinho; a spec atual vale.
- **Script de screenshots** (`npm run screenshots`): com o Playwright, captura entrada, chat com uma conversa, faixa de demo, menu da conta, perfil e os avisos de fallback e bloqueio, nos temas claro e escuro, a 1280 px e a 390 px. As respostas do chat vêm de exemplos fixos, interceptados no navegador, **sem chamar o Gemini**. As imagens não são teste de regressão: vão para a revisão do PR.
- `docs/architecture.md`, `docs/development.md`, `docs/qa.md` (screenshots e checklist de originalidade) e `AGENTS.md` atualizados.

## Fora do escopo

- A página `/marca`, o favicon, a imagem de compartilhamento, os metadados `og:`/`twitter:`, os SVGs com o texto em contorno e os insumos em `public/brand/` (change 3, `add-brand-page-and-sharing`). Por isso o rodapé ainda não tem o link "Marca".
- Símbolo ou mascote da Rango: o logo é só texto. Ilustrações e animações além das três acima.
- Mudanças de comportamento: textos fixos (exceto o "Digitando…" e o rodapé), rotas, login, RAG, prompts e eval.
- Teste de regressão visual com comparação automática de imagens.

## Chamadas reais e checkpoints humanos

- **Implementador:** nenhuma chamada de API ou banco.
- **Orquestrador (autorização prévia):** `npm run dev` com o `dev` para a verificação manual e para rodar `npm run screenshots`. O script entra como demo **uma vez** (uma conta demo no `dev`) e reaproveita a sessão nos quatro contextos. As respostas do chat são interceptadas no navegador, então nenhuma mensagem chega à API do Gemini.
- **Pessoa:** revisar o logo, o ícone do Chapa e as telas nas screenshots, e preencher o checklist de originalidade no PR (no `docs/qa.md`).

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `brand` (criada pela change 1): entram o logo "rango.", o ícone e o avatar do Chapa e a animação de mensagem nova.
- `chat-ui`: o cabeçalho com o logo e o rodapé com o aviso de empresa fictícia; o avatar do Chapa nas respostas; o indicador "Chapa está pensando…" no lugar do "Digitando…", com movimento reduzido.
- `auth`: a tela de entrada ganha o logo e o rodapé.

## Impact

- **Código:** `src/components/brand/` (quatro componentes novos), `src/lib/chapa-icon.ts` (novo), as telas em `src/app/` (`page.tsx`, `entrar/`, `perfil/`, `privacidade/`), os componentes de `src/components/chat/` e `src/components/auth/sign-in-panel.tsx`, `scripts/screenshots.ts` e `scripts/screenshots/` (novos). A lista fechada está no `design.md`.
- **API e banco:** nenhuma mudança.
- **Dependência nova: `playwright` (devDependency, versão exata).** É o jeito de abrir as telas reais, logadas, nos dois temas e em dois tamanhos, e de interceptar o `/api/chat` para não gastar cota. Só o script local usa; a CI não roda screenshots e não baixa navegador. O navegador é instalado uma vez com `npx playwright install chromium`. Alternativas descartadas: prints à mão (16 imagens por revisão, sem garantia de repetir o mesmo estado) e o `@playwright/test` (um executor de testes inteiro para um script que só tira fotos).
