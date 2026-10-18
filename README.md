# HubPG

Site das campanhas de RPG, no estilo de Ordem Paranormal. Cada campanha é uma seção do site, com resumo, personagens e diário de sessões. Cada uma pode ter um tema visual próprio (ordem, fantasia, cyberpunk, terror, espaço).

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

## Editar à mão

Todo o conteúdo está em `campanhas.js`, em formato JSON. Personagens e sessões de cada campanha são editados nesse arquivo (o painel cria a campanha com essas listas vazias). Copie um item existente para usar de modelo. O campo `id` não pode ter espaços nem acentos.

## Ver no computador

Dê dois cliques no `index.html`. Sem internet, as fontes deixam de carregar e o navegador usa uma fonte padrão no lugar. O painel admin precisa de internet e do site já publicado.
