# HubPG

Site das campanhas de RPG, no estilo de Ordem Paranormal. Cada campanha é uma seção do site, com resumo, personagens e diário de sessões. Cada uma pode ter um tema visual próprio (ordem, fantasia, cyberpunk, terror, espaço, sangue).

## Publicar no GitHub Pages

1. Crie um repositório chamado `hubpg`.
2. Suba todos os arquivos desta pasta, com o `index.html` na raiz.
3. Em Settings → Pages, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e clique em Save.
4. O site fica em `seuusuario.github.io/hubpg`.

O site pede aos buscadores para não listá-lo (`noindex`), então só abre para quem tiver o link.

## Admin com conta e Google (Firebase)

O admin (`admin.html`, link "admin" no rodapé) tem **criar conta com nome de usuário e senha** e **entrar com o Google**.
Quem entra pode adicionar, editar e remover campanhas (título, sistema, mestre, status, tema, resumo, personagens e diário de sessões).
As campanhas ficam no Firebase (Firestore), então o site atualiza na hora ao salvar, sem token do GitHub.

Configuração (uma vez só, depende da sua conta Google):

1. Em https://console.firebase.google.com crie um projeto (o Analytics pode ficar desligado).
2. **Authentication > Sign-in method**: ative **E-mail/senha** (é ela que guarda o nome de usuário) e **Google**.
3. **Authentication > Settings > Authorized domains**: adicione `felipevalbonetti.github.io`.
4. **Firestore Database > Criar banco** (modo produção, região `southamerica-east1`).
5. Cole o conteúdo de `firestore.rules` em **Firestore > Regras** e publique. Não precisa trocar nada.
6. **Configurações do projeto > Seus apps > Web (`</>`)**: registre um app e copie o `firebaseConfig` para o `firebase-config.js`. Faça commit.
7. Abra `admin.html`, crie a conta e use **Importar as campanhas do campanhas.js** na primeira vez.

Detalhes:
- Nome de usuário: 3 a 30 caracteres (letras sem acento, números, `.`, `-`, `_`). Senha: no mínimo 6 caracteres (o Firebase não aceita `1234`; `123456` funciona).
- Não há recuperação de senha nem confirmação de e-mail para contas de usuário. Se esquecer a senha, crie outra conta (ou apague a antiga no console do Firebase).
- **Qualquer pessoa que criar uma conta consegue editar o site.** Depois de criar a sua, dá para desativar novos cadastros no console do Firebase (Authentication > Settings > User actions).
- Sem o `firebase-config.js` preenchido, o admin só mostra um aviso, e o site lê o `campanhas.js`. Se a nuvem falhar, o site público mostra o `campanhas.js` com um aviso.

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
