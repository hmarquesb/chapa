# Spec Delta

## Purpose

Abre para consulta, sem login, os documentos da base de conhecimento que o Chapa usa no RAG, para quem visita o projeto entender de onde vêm as respostas e conferir uma fonte.

## ADDED Requirements

### Requirement: Lista da base de conhecimento
A página `/base` SHALL abrir sem login, em PT-BR, com o logo da Rango, o título "Base de conhecimento", uma introdução que explica que o Chapa busca trechos destes documentos antes de responder (a técnica de RAG) e a lista dos documentos numerados de `knowledge-base/`, em ordem de número. Cada item mostra o título do documento, os títulos das seções e leva à página do documento.

#### Scenario: Visitante sem login
- **WHEN** alguém sem sessão abre `/base`
- **THEN** a página abre, sem ir para `/entrar`, com o título "Base de conhecimento", a introdução e um item por documento numerado

#### Scenario: Item da lista
- **WHEN** a lista mostra o documento `01-planos-e-taxas.md`
- **THEN** o item tem o título "Planos e taxas", os títulos das seções separados por " · " e o link para `/base/01-planos-e-taxas`

#### Scenario: Arquivos de apoio
- **WHEN** a pasta tem também o `README.md` e o `regras.yaml`
- **THEN** nenhum dos dois aparece na lista

### Requirement: Página de um documento
A página `/base/<arquivo>`, em que `<arquivo>` é o nome do documento sem `.md`, SHALL abrir sem login e mostrar o documento inteiro, formatado, com o link "Voltar para a base de conhecimento". Um nome que não é de documento numerado MUST dar a página 404.

#### Scenario: Documento existente
- **WHEN** alguém abre `/base/02-repasse-financeiro`
- **THEN** vê o texto completo de `02-repasse-financeiro.md` com o título "Repasse financeiro" e o link de volta para `/base`

#### Scenario: Nome desconhecido
- **WHEN** alguém abre `/base/12-publicidade` ou `/base/README`
- **THEN** a resposta é a página 404

### Requirement: Formatação do documento
A página do documento SHALL desenhar os elementos de markdown que a base usa: títulos de nível 1 a 3, parágrafos, listas com marcador e numeradas, citação e negrito. O texto MUST ser mostrado como texto, nunca interpretado como HTML.

#### Scenario: Aviso de política
- **WHEN** o documento começa com a linha `> Política de parceiros da Rango, vigente desde 01/11/2026. …`
- **THEN** a página mostra esse aviso como citação, sem o sinal `>`

#### Scenario: Lista numerada com negrito
- **WHEN** o documento tem os itens `1. No Painel Rango, abra Promoções > Nova campanha.` e `- **Plano Próprio:** a própria loja entrega`
- **THEN** a página mostra uma lista numerada com o texto "No Painel Rango, abra Promoções > Nova campanha." e uma lista com marcador em que "Plano Próprio:" aparece em negrito, sem asteriscos

#### Scenario: HTML no texto
- **WHEN** um documento tem o texto `<script>alert(1)</script>` num parágrafo
- **THEN** a página mostra esses caracteres como texto, e nenhum script roda

### Requirement: Base mostrada igual à usada pelo RAG
As páginas da base SHALL mostrar exatamente os documentos que a ingestão lê, pela mesma regra de nome de arquivo, e MUST NOT ler o banco nem chamar a API do modelo.

#### Scenario: Mesma lista da ingestão
- **WHEN** a ingestão e a página leem a mesma pasta `knowledge-base/`
- **THEN** a página lista os mesmos arquivos que a ingestão transforma em trechos

#### Scenario: Sem banco
- **WHEN** as páginas da base são geradas sem `DATABASE_URL` nem `GEMINI_API_KEY`
- **THEN** elas abrem normalmente

### Requirement: Link para a base no rodapé
O rodapé das telas que usam o rodapé do site SHALL ter o link "Base de conhecimento" para `/base`, junto dos links "Privacidade" e "Marca".

#### Scenario: Rodapé do chat
- **WHEN** alguém logado olha o rodapé do chat
- **THEN** vê os links "Privacidade", "Marca" e "Base de conhecimento"
