// Arquivo gerado pelo painel admin do HubPG (admin.html).
// Pode ser editado a mão, desde que o conteúdo continue em formato JSON valido.
// Temas disponiveis: ordem, fantasia, cyberpunk, terror, espaco, sangue.
// Sistemas (sistemaId): ordem, conduta, dnd5e, livre. Cada campanha ganha o botao
// "Criar personagem" com a ficha do sistema escolhido.
const CAMPANHAS = [
  {
    "id": "exemplo-1",
    "titulo": "Campanha de Exemplo 1",
    "sistema": "A Conduta",
    "sistemaId": "conduta",
    "mestre": "Nome do mestre",
    "status": "Em andamento",
    "tema": "ordem",
    "resumo": "Escreva aqui a premissa da campanha: onde começa, quem são os investigadores e qual mistério eles precisam resolver.",
    "personagens": [
      {
        "nome": "Personagem A",
        "jogador": "Nome do jogador",
        "classe": "Arquétipo a definir",
        "descricao": "Uma frase sobre quem é esse personagem."
      },
      {
        "nome": "Personagem B",
        "jogador": "Nome do jogador",
        "classe": "Arquétipo a definir",
        "descricao": "Uma frase sobre quem é esse personagem."
      }
    ],
    "sessoes": [
      {
        "numero": 1,
        "titulo": "Título da sessão",
        "data": "2026-10-17",
        "texto": "Resumo do que aconteceu na sessão."
      }
    ]
  },
  {
    "id": "exemplo-2",
    "titulo": "Campanha de Exemplo 2",
    "sistema": "D&D 5e",
    "sistemaId": "dnd5e",
    "mestre": "Nome do mestre",
    "status": "Pausada",
    "tema": "fantasia",
    "resumo": "Outra campanha, com tema de fantasia medieval. Troque este texto pela história dela.",
    "personagens": [],
    "sessoes": []
  },
  {
    "id": "exemplo-3",
    "titulo": "Campanha de Exemplo 3",
    "sistema": "Cyberpunk RED",
    "sistemaId": "livre",
    "mestre": "Nome do mestre",
    "status": "Encerrada",
    "tema": "cyberpunk",
    "resumo": "Mais uma campanha, só para mostrar o menu com três seções e temas diferentes.",
    "personagens": [],
    "sessoes": []
  }
];
