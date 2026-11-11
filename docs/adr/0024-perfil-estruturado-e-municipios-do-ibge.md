# 0024. Perfil estruturado e municípios do IBGE

- **Status:** Aceito
- **Data:** 2026-11-11

## Contexto

A cozinha e a cidade do perfil eram texto livre. O mesmo tipo de comida aparecia escrito de várias formas ("pizzaria", "Pizza", "pizzas"), a cidade podia ter grafia errada ou ser ambígua ("Bom Jesus" existe em vários estados), e o assistente recebia texto que não dava para conferir. O perfil também precisa de uma versão explícita, porque as próximas mudanças (horário estruturado) vão estender o formato.

## Decisão

- **Perfil `version: 2`, com tipos, listas e regras em `src/lib/profile/`.** A cozinha é um id de uma lista fixa (`cuisines.ts`) ou "Outro" com texto curto. O local é a UF e, opcionalmente, o código IBGE da cidade. O nome da cidade nunca é guardado: vem da lista pelo código. A pasta fica em `src/lib/` porque a interface, a API, o banco, o assistente e os scripts a usam.
- **Municípios do IBGE no repositório**, um módulo por UF em `src/lib/profile/cities/`, gerado por `scripts/ibge/generate-cities.ts` e carregado por `import()` estático por UF. O bundler gera um pedaço por UF, e o mesmo código funciona no Next, no `tsx` e no Vitest. A lista só precisa ser regenerada quando o IBGE criar ou renomear municípios.
- **Um parser só, `parseProfileInput`**, para o `PUT /api/profile`, o `--perfil` do CLI e o eval. O filtro de termos do [ADR 0023](0023-filtro-local-de-termos-no-perfil.md) roda nele, no nome e no texto de "Outro".
- **Conversão na leitura, `upgradeProfile`.** Todo perfil lido do banco passa por ela: o formato antigo (texto livre) vira o v2 por sinônimos e por busca do nome da cidade, e o que não for convertido com segurança é descartado e marca `needsReview`. O banco não muda; o dado só é reescrito quando a pessoa salva. A interface mostra uma faixa de revisão quando `needsReview` é verdadeiro.

## Alternativas consideradas

- **Manter o texto livre.** Descartada: não dá para conferir, não filtra, não separa cidades homônimas e deixa o prompt com grafias variadas.
- **Consultar a API do IBGE em tempo de execução.** Descartada: dependência externa e latência a cada digitação, para uma lista que quase não muda.
- **Só capitais e cidades grandes.** Descartada: exclui os restaurantes do interior.
- **Migração de dados no banco.** Descartada: exigiria ordenar migração e deploy e um passo no `prod`, e um erro na conversão destruiria o dado original. A conversão na leitura não tem ordem a seguir nem risco para o dado.

## Consequências

- Uma regra de validação e uma de conversão para todos os pontos de entrada, testadas sem rede.
- A conversão roda a cada leitura de perfil antigo, e a de cidade carrega os módulos de todas as UFs (ficam em cache no processo). Os perfis antigos somem à medida que são salvos ou que as demos expiram.
- O CLI perde as flags `--cozinha`, `--cidade` e `--horario`: o perfil estruturado vai num arquivo (`--perfil`).
- Para voltar atrás basta reverter o deploy: o código antigo descarta os campos novos e mantém nome, plano e horário.
- A interface ganha `command`, `popover` e `native-select` do shadcn e a dependência `cmdk`.
