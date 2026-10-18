# HubPG

Site das campanhas de RPG, no estilo de Ordem Paranormal. Cada campanha é uma seção do site, com resumo, personagens e diário de sessões. Cada uma pode ter um tema visual próprio (ordem, fantasia, cyberpunk, terror, espaço, sangue).

## Publicar no GitHub Pages

1. Crie um repositório chamado `hubpg`.
2. Suba todos os arquivos desta pasta, com o `index.html` na raiz.
3. Em Settings → Pages, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e clique em Save.
4. O site fica em `seuusuario.github.io/hubpg`.

O site pede aos buscadores para não listá-lo (`noindex`), então só abre para quem tiver o link.

## Painel admin (adicionar e remover campanhas)

Abra `admin.html` (há um link "admin" no rodapé do site). Como o GitHub Pages não tem servidor, a "senha" do painel é um token do GitHub: quem não tem o token abre a página, mas não consegue alterar nada.

Para criar o token (uma vez só):

1. No GitHub, vá em Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
2. Em **Repository access**, escolha *Only select repositories* e marque o `hubpg`.
3. Em **Permissions → Repository permissions**, coloque **Contents: Read and write**.
4. Escolha uma validade (por exemplo 90 dias), gere e copie o token. Ele só aparece uma vez.

Depois é só colar o token no painel. Você pode adicionar campanhas (com sistema, mestre, status, tema e resumo), remover as que não quiser e clicar em **Salvar no GitHub**. O site atualiza em cerca de um minuto. O token fica só na aba do navegador e é enviado apenas ao GitHub. Não compartilhe o token e não coloque ele em nenhum arquivo do repositório.

## Criar personagem

Cada campanha tem o botão **Criar personagem**, que abre a ficha do sistema de RPG daquela campanha. O sistema vem do campo `sistemaId` em `campanhas.js` (o painel admin preenche sozinho pelo nome do sistema que você digitar):

| `sistemaId` | Sistema | O que a ficha calcula sozinha |
|---|---|---|
| `ordem` | Ordem Paranormal | Criação no NEX 5%: distribuição de atributos, PV, SAN, PE, defesa, perícias treinadas e dados |
| `conduta` | A Conduta | Segue a ficha oficial em PDF (AGI, FOR, INT, FRE, VIG, resistências, ataques, árvore). **Sem cálculos**: PV, SAN, PE e defesa são digitados à mão, porque as regras ainda não foram informadas |
| `dnd5e` | D&D 5e | Livro do Jogador 2014, nível 1: compra de pontos ou rolagem, bônus de raça, PV, CA, salvaguardas e perícias |
| `livre` | Ficha livre | Nada: você escreve atributos, recursos e perícias do jeito do seu sistema |

A ficha avisa quando algo foge das regras, mas não bloqueia. As fichas ficam salvas **no navegador de quem as criou**, então para guardar ou mandar para o mestre use **Exportar JSON** (e **Importar JSON** para abrir de novo) ou **Imprimir** (também serve para salvar em PDF). **Copiar resumo** gera o bloco para colar em `personagens` no `campanhas.js`.

Para criar um sistema novo, copie um bloco `SISTEMAS.xxx = {...}` em `sistemas.js` e ajuste. Quando as regras de A Conduta forem definidas, troque o `max: null` de PV, SAN e PE por uma conta, como em Ordem Paranormal.

## Ícone do site

O ícone provisório é o `favicon.png` (mais `favicon.ico` e `apple-touch-icon.png`). Para trocar, substitua esses três arquivos mantendo os nomes. Confira se você tem licença de uso da imagem atual.

## Editar à mão

Todo o conteúdo está em `campanhas.js`, em formato JSON. Personagens e sessões de cada campanha são editados nesse arquivo (o painel cria a campanha com essas listas vazias). Copie um item existente para usar de modelo. O campo `id` não pode ter espaços nem acentos.

## Ver no computador

Dê dois cliques no `index.html`. Sem internet, as fontes deixam de carregar e o navegador usa uma fonte padrão no lugar. O painel admin precisa de internet e do site já publicado.
