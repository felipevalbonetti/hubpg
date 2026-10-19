// =====================================================================
//  CONFIGURAÇÃO DO FIREBASE
//
//  Enquanto isto estiver como null, o site funciona como antes: lê as
//  campanhas do arquivo campanhas.js e o painel admin usa o token do GitHub.
//
//  Depois de criar o projeto no Firebase (passo a passo no README), troque
//  o null pelo objeto que o Firebase mostra em "Configurações do projeto >
//  Seus aplicativos > Configuração do SDK". Exemplo:
//
//  window.FIREBASE_CONFIG = {
//    apiKey: "AIza...",
//    authDomain: "seu-projeto.firebaseapp.com",
//    projectId: "seu-projeto",
//    appId: "1:1234567890:web:abcdef"
//  };
//
//  Esses valores NÃO são segredo (todo site com Firebase os mostra). Quem
//  protege os dados são as regras do Firestore, no arquivo firestore.rules.
// =====================================================================
window.FIREBASE_CONFIG = null;
