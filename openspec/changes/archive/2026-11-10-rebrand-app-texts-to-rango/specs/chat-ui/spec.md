# Spec Delta

## MODIFIED Requirements

### Requirement: Perguntas de exemplo
Com a conversa vazia e sem carregamento em curso, a interface SHALL mostrar três perguntas de exemplo, "Quando o repasse cai na minha conta?", "Quem paga o desconto quando eu crio um cupom?" e "Me passa uma receita de lasanha?", e enviar a escolhida como se o parceiro a tivesse digitado.

#### Scenario: Clique num exemplo
- **WHEN** o parceiro clica em "Quando o repasse cai na minha conta?"
- **THEN** essa pergunta é enviada e os exemplos somem quando a conversa deixa de estar vazia
