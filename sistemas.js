// =====================================================================
//  SISTEMAS DE RPG DO HUBPG
//  Cada sistema descreve como a ficha daquele RPG é montada: atributos,
//  regras de distribuição, perícias e valores calculados.
//  A página personagem.html lê estas definições e monta a ficha sozinha.
//
//  Para criar um sistema novo, copie um bloco "SISTEMAS.xxx = {...}"
//  e ajuste. Os números ficam todos concentrados no topo de cada bloco.
// =====================================================================

var SISTEMAS = {};

function hubpgNorm(t) {
  return String(t || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hubpgSinal(n) { return (n >= 0 ? "+" : "") + n; }

// Campos de lista reutilizados em vários sistemas
var HUBPG_CARTAO = [
  { k: "nome", ph: "Nome", tipo: "texto" },
  { k: "texto", ph: "Descrição", tipo: "area" }
];

// ---------------------------------------------------------------------
//  ORDEM PARANORMAL (criação no NEX 5%)
// ---------------------------------------------------------------------
(function () {
  var CLASSES = {
    combatente:   { nome: "Combatente",   pv: 20, pe: 2, san: 12, treinadas: 3,
                    dica: "Combatente: Luta ou Pontaria e Fortitude ou Reflexos estão entre as perícias treinadas." },
    especialista: { nome: "Especialista", pv: 16, pe: 3, san: 16, treinadas: 7,
                    dica: "Especialista: escolha livre das perícias treinadas." },
    ocultista:    { nome: "Ocultista",    pv: 12, pe: 4, san: 20, treinadas: 3, fixas: ["ocultismo", "vontade"],
                    dica: "Ocultista: Ocultismo e Vontade já vêm treinadas." }
  };

  // Perícias que só podem ser usadas por quem é treinado (marcadas com * na ficha)
  var SO_TREINADA = ["adestramento", "artes", "ciencias", "crime", "medicina", "ocultismo",
                     "pilotagem", "profissao", "religiao", "tatica", "tecnologia"];

  // [id, nome, atributo]
  var PERICIAS = [
    ["acrobacia", "Acrobacia", "agi"], ["adestramento", "Adestramento", "pre"], ["artes", "Artes", "pre"],
    ["atletismo", "Atletismo", "for"], ["atualidades", "Atualidades", "int"], ["ciencias", "Ciências", "int"],
    ["crime", "Crime", "agi"], ["diplomacia", "Diplomacia", "pre"], ["enganacao", "Enganação", "pre"],
    ["fortitude", "Fortitude", "vig"], ["furtividade", "Furtividade", "agi"], ["iniciativa", "Iniciativa", "agi"],
    ["intimidacao", "Intimidação", "pre"], ["intuicao", "Intuição", "pre"], ["investigacao", "Investigação", "int"],
    ["luta", "Luta", "for"], ["medicina", "Medicina", "int"], ["ocultismo", "Ocultismo", "int"],
    ["percepcao", "Percepção", "pre"], ["pilotagem", "Pilotagem", "agi"], ["pontaria", "Pontaria", "agi"],
    ["profissao", "Profissão", "int"], ["reflexos", "Reflexos", "agi"], ["religiao", "Religião", "pre"],
    ["sobrevivencia", "Sobrevivência", "int"], ["tatica", "Tática", "int"], ["tecnologia", "Tecnologia", "int"],
    ["vontade", "Vontade", "pre"]
  ].map(function (p) {
    return { id: p[0], nome: p[1], attr: p[2], so: SO_TREINADA.indexOf(p[0]) !== -1 };
  });

  var BONUS_TREINADA = 5;
  var PERICIAS_ORIGEM = 2;

  function classe(f) { return CLASSES[f.ident.classe] || CLASSES.combatente; }

  SISTEMAS.ordem = {
    id: "ordem",
    nome: "Ordem Paranormal",
    tema: "ordem",
    aliases: ["ordem paranormal", "op rpg"],
    resumo: "Criação no NEX 5%, com as regras do livro básico.",

    identidade: [
      { id: "nome", rotulo: "Nome" },
      { id: "jogador", rotulo: "Jogador" },
      { id: "origem", rotulo: "Origem" },
      { id: "classe", rotulo: "Classe", tipo: "select",
        opcoes: [["combatente", "Combatente"], ["especialista", "Especialista"], ["ocultista", "Ocultista"]] }
    ],

    atributos: {
      lista: [
        { id: "agi", sigla: "AGI", nome: "Agilidade" },
        { id: "for", sigla: "FOR", nome: "Força" },
        { id: "int", sigla: "INT", nome: "Intelecto" },
        { id: "pre", sigla: "PRE", nome: "Presença" },
        { id: "vig", sigla: "VIG", nome: "Vigor" }
      ],
      modos: [{
        id: "padrao", nome: "Criação padrão", inicio: 1, min: 0, max: 3, orcamento: 4,
        custo: function (v) { return v === 0 ? -1 : v - 1; },
        dica: "Todos começam em 1. Distribua 4 pontos, com no máximo 3 em cada atributo. " +
              "Reduzir um atributo a 0 devolve 1 ponto extra."
      }]
    },

    recursos: function (f, v) {
      var c = classe(f);
      return [
        { id: "pv", rotulo: "PV", nome: "Pontos de Vida", max: c.pv + v.vig },
        { id: "san", rotulo: "SAN", nome: "Sanidade", max: c.san },
        { id: "pe", rotulo: "PE", nome: "Pontos de Esforço", max: c.pe + v.pre }
      ];
    },

    derivados: function (f, v) {
      return [
        { rotulo: "Defesa", valor: String(10 + v.agi) },
        { rotulo: "Deslocamento", valor: "9 m" },
        { rotulo: "Dados de AGI", valor: v.agi === 0 ? "2 (pega o menor)" : String(v.agi) }
      ];
    },

    pericias: {
      lista: PERICIAS,
      fixas: function (f) { return classe(f).fixas || []; },
      limite: function (f, v) {
        var c = classe(f);
        var livres = c.treinadas + v.int;
        return {
          total: livres + PERICIAS_ORIGEM,
          texto: c.nome + " " + c.treinadas + " + INT " + v.int + " + origem " + PERICIAS_ORIGEM
        };
      },
      calc: function (p, marcada, v) {
        var d = v[p.attr];
        var dados = d === 0 ? "2d20 (menor)" : d + "d20";
        return dados + (marcada ? "+" + BONUS_TREINADA : "");
      },
      dica: function (f) { return classe(f).dica; }
    },

    avisos: function (f, ctx) {
      var out = [];
      if (ctx.treino && ctx.treino.usadas > ctx.treino.total) {
        out.push("Você marcou mais perícias do que o permitido (" + ctx.treino.usadas + " de " + ctx.treino.total + ").");
      }
      var zeros = 0;
      Object.keys(ctx.v).forEach(function (k) { if (ctx.v[k] === 0) zeros++; });
      if (zeros > 1) out.push("Mais de um atributo em 0: confira com o seu mestre se o ponto extra vale para todos.");
      return out;
    },

    layout: [
      { tipo: "identidade" },
      { tipo: "avisos" },
      { tipo: "atributos" },
      { tipo: "recursos" },
      { tipo: "derivados" },
      { tipo: "pericias" },
      { tipo: "lista", id: "habilidades", titulo: "Habilidades e poderes", campos: HUBPG_CARTAO },
      { tipo: "lista", id: "equipamentos", titulo: "Equipamentos", campos: HUBPG_CARTAO },
      { tipo: "texto", id: "historia", titulo: "História e anotações" }
    ]
  };
})();

// ---------------------------------------------------------------------
//  A CONDUTA (ficha oficial em PDF)
//  Os campos e as perícias seguem a ficha. As regras de cálculo (PV, SAN,
//  PE, defesa, resistências) ainda não foram informadas, então esses valores
//  são digitados à mão. Quando as regras existirem, basta trocar o "max: null"
//  de cada recurso por uma conta, como no sistema Ordem Paranormal acima.
// ---------------------------------------------------------------------
(function () {
  var ATRIBUTOS = [
    { id: "agi", sigla: "AGI", nome: "Agilidade" },
    { id: "for", sigla: "FOR", nome: "Força" },
    { id: "int", sigla: "INT", nome: "Intelecto" },
    { id: "fre", sigla: "FRE", nome: "Frequência" },
    { id: "vig", sigla: "VIG", nome: "Vigor" }
  ];

  // [id, nome, atributo, só pode ser usada por quem é treinado (*)]
  var PERICIAS = [
    ["acrobacia", "Acrobacia", "agi"], ["crime", "Crime", "agi", 1], ["furtividade", "Furtividade", "agi"],
    ["iniciativa", "Iniciativa", "agi"], ["pilotagem", "Pilotagem", "agi", 1], ["pontaria", "Pontaria", "agi"],
    ["reflexos", "Reflexos", "agi"],
    ["atletismo", "Atletismo", "for"], ["luta", "Luta", "for"],
    ["atualidades", "Atualidades", "int"], ["criacao", "Criação", "int", 1], ["ciencias", "Ciências", "int"],
    ["intuicao", "Intuição", "int"], ["investigacao", "Investigação", "int"], ["medicina", "Medicina", "int", 1],
    ["ocultismo", "Ocultismo", "int", 1], ["primeiros-socorros", "Primeiros Socorros", "int", 1],
    ["profissao", "Profissão", "int"], ["sobrevivencia", "Sobrevivência", "int"], ["tatica", "Tática", "int", 1],
    ["tecnologia", "Tecnologia", "int", 1],
    ["adestramento", "Adestramento", "fre", 1], ["artes", "Artes", "fre", 1], ["diplomacia", "Diplomacia", "fre"],
    ["canalizacao", "Canalização", "fre"], ["enganacao", "Enganação", "fre"], ["intimidacao", "Intimidação", "fre"],
    ["percepcao", "Percepção", "fre"], ["religiao", "Religião", "fre"], ["vontade", "Vontade", "fre"],
    ["sentidos", "Sentidos", "fre"],
    ["fortitude", "Fortitude", "vig"]
  ].map(function (p) { return { id: p[0], nome: p[1], attr: p[2], so: !!p[3] }; });

  function manual(id, rotulo) { return { id: id, rotulo: rotulo }; }

  SISTEMAS.conduta = {
    id: "conduta",
    nome: "A Conduta",
    tema: "ordem",
    foto: true,
    aliases: ["a conduta", "conduta"],
    resumo: "Ficha oficial de A Conduta. As regras de cálculo ainda não estão configuradas: preencha os valores à mão.",

    identidade: [
      { id: "nome", rotulo: "Nome" },
      { id: "jogador", rotulo: "Jogador" },
      { id: "antecedente", rotulo: "Antecedente" },
      { id: "idade", rotulo: "Idade" },
      { id: "nacionalidade", rotulo: "Nacionalidade" },
      { id: "reside", rotulo: "Onde reside" },
      { id: "exposicao", rotulo: "Exposição paranormal (%)" },
      { id: "dinheiro", rotulo: "Dinheiro" },
      { id: "patente", rotulo: "Patente" },
      { id: "traco", rotulo: "Traço" }
    ],

    atributos: {
      lista: ATRIBUTOS,
      modos: [{
        id: "livre", nome: "Valores livres", inicio: 1, min: 0, max: 10,
        dica: "Ainda não há regra de distribuição configurada para A Conduta. Ajuste os valores como o mestre mandar."
      }]
    },

    // max: null = o máximo é digitado à mão
    recursos: function () {
      return [
        { id: "pv", rotulo: "PV", nome: "Pontos de Vida", max: null },
        { id: "san", rotulo: "SAN", nome: "Sanidade", max: null },
        { id: "pe", rotulo: "PE", nome: "Pontos de Esotéricos", max: null }
      ];
    },

    pericias: {
      lista: PERICIAS,
      agrupar: true,
      limite: function () { return { total: null, texto: "" }; },
      calc: function (p, marcada) { return marcada ? "treinada" : ""; }
    },

    layout: [
      { tipo: "identidade" },
      { tipo: "atributos" },
      { tipo: "recursos" },
      { tipo: "marcas", titulo: "Condições", grupos: [
          { id: "morrendo", rotulo: "Turnos morrendo", qtd: 4 },
          { id: "enlouquecendo", rotulo: "Enlouquecendo", qtd: 3 },
          { id: "ferida", rotulo: "Ferida grave", qtd: 1 }] },
      { tipo: "lista", id: "condicoes", titulo: "Outras condições", campos: [
          { k: "nome", ph: "Condição", tipo: "texto" }] },
      { tipo: "numeros", titulo: "Defesa", itens: [
          manual("bloquear", "Bloquear"), manual("esquivar", "Esquivar"), manual("protecao", "Proteção")] },
      { tipo: "escolha", id: "protecao-tipo", titulo: "Tipo de proteção", opcoes: [
          ["leve", "Leve"], ["media", "Média"], ["pesada", "Pesada"], ["especial", "???"], ["nenhuma", "Nenhuma"]] },
      { tipo: "numeros", titulo: "Movimento", itens: [
          manual("deslocamento", "Deslocamento"), manual("iniciativa", "Iniciativa")] },
      { tipo: "numeros", titulo: "Resistências", largo: true, itens: [
          manual("res-perfurante", "Perfurante"), manual("res-cortante", "Cortante"),
          manual("res-concussao", "Concussão"), manual("res-balistica", "Balística"),
          manual("res-fogo", "Fogo"), manual("res-acida", "Ácida"), manual("res-mental", "Mental")] },
      { tipo: "pericias" },
      { tipo: "lista", id: "ataques", titulo: "Ataques", campos: [
          { k: "arma", ph: "Arma", tipo: "texto" }, { k: "tipo", ph: "Tipo", tipo: "texto" },
          { k: "ataque", ph: "Ataque", tipo: "texto" }, { k: "alcance", ph: "Alcance", tipo: "texto" },
          { k: "dano", ph: "Dano", tipo: "texto" }, { k: "crit", ph: "Crít.", tipo: "texto" },
          { k: "extra", ph: "Extra", tipo: "texto" }] },
      { tipo: "lista", id: "equipamentos", titulo: "Equipamentos", campos: [
          { k: "nome", ph: "Equipamento", tipo: "texto" }, { k: "peso", ph: "P (peso)", tipo: "numero" }] },
      { tipo: "texto", id: "habilidades", titulo: "Habilidades (classe, arquétipo e dons)" },
      { tipo: "texto", id: "poderes", titulo: "Poderes paranormais" },
      { tipo: "texto", id: "inventario", titulo: "Inventário (itens, proficiências, peso total)" },
      { tipo: "campos", titulo: "Árvore", itens: [
          { id: "arvore-exposicao", rotulo: "Exposição paranormal / nível (%)" },
          { id: "arvore-classe", rotulo: "Classe · arquétipo" },
          { id: "arvore-afinidade", rotulo: "Afinidade / consumida" }] },
      { tipo: "texto", id: "arvore", titulo: "Árvore: evolução e anotações" }
    ]
  };
})();

// ---------------------------------------------------------------------
//  D&D 5e (Livro do Jogador 2014, nível 1)
// ---------------------------------------------------------------------
(function () {
  var CUSTO = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  var PROFICIENCIA = 2;
  var PERICIAS_ANTECEDENTE = 2;

  var ATRIBUTOS = [
    { id: "for", sigla: "FOR", nome: "Força" },
    { id: "des", sigla: "DES", nome: "Destreza" },
    { id: "con", sigla: "CON", nome: "Constituição" },
    { id: "int", sigla: "INT", nome: "Inteligência" },
    { id: "sab", sigla: "SAB", nome: "Sabedoria" },
    { id: "car", sigla: "CAR", nome: "Carisma" }
  ];

  var RACAS = {
    anao:      { nome: "Anão",      bonus: { con: 2 }, desloc: "7,5 m" },
    elfo:      { nome: "Elfo",      bonus: { des: 2 }, desloc: "9 m" },
    halfling:  { nome: "Halfling",  bonus: { des: 2 }, desloc: "7,5 m" },
    humano:    { nome: "Humano",    bonus: { "for": 1, des: 1, con: 1, int: 1, sab: 1, car: 1 }, desloc: "9 m" },
    draconato: { nome: "Draconato", bonus: { "for": 2, car: 1 }, desloc: "9 m" },
    gnomo:     { nome: "Gnomo",     bonus: { int: 2 }, desloc: "7,5 m" },
    meioelfo:  { nome: "Meio-elfo", bonus: { car: 2 }, desloc: "9 m",
                 nota: "Meio-elfo: +1 em dois atributos à sua escolha. Use o campo \"extra\" dos atributos." },
    meioorc:   { nome: "Meio-orc",  bonus: { "for": 2, con: 1 }, desloc: "9 m" },
    tiefling:  { nome: "Tiefling",  bonus: { car: 2, int: 1 }, desloc: "9 m" },
    outra:     { nome: "Outra / manual", bonus: {}, desloc: "9 m",
                 nota: "Raça sem bônus automático: use o campo \"extra\" dos atributos." }
  };

  // dado de vida, perícias a escolher, salvaguardas proficientes
  var CLASSES = {
    barbaro:     { nome: "Bárbaro",     dado: 12, pericias: 2, saves: ["for", "con"] },
    bardo:       { nome: "Bardo",       dado: 8,  pericias: 3, saves: ["des", "car"] },
    clerigo:     { nome: "Clérigo",     dado: 8,  pericias: 2, saves: ["sab", "car"] },
    druida:      { nome: "Druida",      dado: 8,  pericias: 2, saves: ["int", "sab"] },
    guerreiro:   { nome: "Guerreiro",   dado: 10, pericias: 2, saves: ["for", "con"] },
    monge:       { nome: "Monge",       dado: 8,  pericias: 2, saves: ["for", "des"] },
    paladino:    { nome: "Paladino",    dado: 10, pericias: 2, saves: ["sab", "car"] },
    patrulheiro: { nome: "Patrulheiro", dado: 10, pericias: 3, saves: ["for", "des"] },
    ladino:      { nome: "Ladino",      dado: 8,  pericias: 4, saves: ["des", "int"] },
    feiticeiro:  { nome: "Feiticeiro",  dado: 6,  pericias: 2, saves: ["con", "car"] },
    bruxo:       { nome: "Bruxo",       dado: 8,  pericias: 2, saves: ["sab", "car"] },
    mago:        { nome: "Mago",        dado: 6,  pericias: 2, saves: ["int", "sab"] }
  };

  var PERICIAS = [
    ["acrobacia", "Acrobacia", "des"], ["adestrar", "Adestrar Animais", "sab"], ["arcanismo", "Arcanismo", "int"],
    ["atletismo", "Atletismo", "for"], ["atuacao", "Atuação", "car"], ["enganacao", "Enganação", "car"],
    ["furtividade", "Furtividade", "des"], ["historia", "História", "int"], ["intimidacao", "Intimidação", "car"],
    ["intuicao", "Intuição", "sab"], ["investigacao", "Investigação", "int"], ["medicina", "Medicina", "sab"],
    ["natureza", "Natureza", "int"], ["percepcao", "Percepção", "sab"], ["persuasao", "Persuasão", "car"],
    ["prestidigitacao", "Prestidigitação", "des"], ["religiao", "Religião", "int"], ["sobrevivencia", "Sobrevivência", "sab"]
  ].map(function (p) { return { id: p[0], nome: p[1], attr: p[2] }; });

  function mod(n) { return Math.floor((n - 10) / 2); }
  function classe(f) { return CLASSES[f.ident.classe] || CLASSES.guerreiro; }
  function raca(f) { return RACAS[f.ident.raca] || RACAS.humano; }
  function opcoes(obj) { return Object.keys(obj).map(function (k) { return [k, obj[k].nome]; }); }

  SISTEMAS.dnd5e = {
    id: "dnd5e",
    nome: "D&D 5e",
    tema: "fantasia",
    aliases: ["d d 5e", "dnd 5e", "d d", "dnd", "dungeons dragons"],
    resumo: "Criação no nível 1, com as regras do Livro do Jogador (2014).",

    identidade: [
      { id: "nome", rotulo: "Nome" },
      { id: "jogador", rotulo: "Jogador" },
      { id: "raca", rotulo: "Raça", tipo: "select", opcoes: opcoes(RACAS) },
      { id: "classe", rotulo: "Classe", tipo: "select", opcoes: opcoes(CLASSES) },
      { id: "antecedente", rotulo: "Antecedente" },
      { id: "alinhamento", rotulo: "Alinhamento" }
    ],

    atributos: {
      lista: ATRIBUTOS,
      extra: true,
      modificador: mod,
      modos: [
        { id: "compra", nome: "Compra de pontos (27)", inicio: 8, min: 8, max: 15, orcamento: 27,
          custo: function (v) { return CUSTO[v]; },
          dica: "Todos começam em 8. Você tem 27 pontos; o valor base vai de 8 a 15 (antes dos bônus de raça)." },
        { id: "manual", nome: "Manual / rolagem", inicio: 10, min: 3, max: 20, rolagem: true,
          dica: "Defina os valores à mão ou use o botão para rolar 4d6 e descartar o menor dado." }
      ]
    },

    bonusAtributos: function (f) { return raca(f).bonus; },

    recursos: function (f, v) {
      var c = classe(f);
      return [{ id: "pv", rotulo: "PV", nome: "Pontos de Vida", max: Math.max(1, c.dado + mod(v.con)) }];
    },

    derivados: function (f, v) {
      var c = classe(f), r = raca(f);
      var out = [
        { rotulo: "Bônus de proficiência", valor: hubpgSinal(PROFICIENCIA) },
        { rotulo: "CA (sem armadura)", valor: String(10 + mod(v.des)) },
        { rotulo: "Iniciativa", valor: hubpgSinal(mod(v.des)) },
        { rotulo: "Deslocamento", valor: r.desloc },
        { rotulo: "Dado de vida", valor: "1d" + c.dado }
      ];
      if (f.ident.classe === "barbaro") out.push({ rotulo: "CA (Defesa sem Armadura)", valor: String(10 + mod(v.des) + mod(v.con)) });
      if (f.ident.classe === "monge") out.push({ rotulo: "CA (Defesa sem Armadura)", valor: String(10 + mod(v.des) + mod(v.sab)) });
      var percepcao = mod(v.sab) + (f.pericias.percepcao ? PROFICIENCIA : 0);
      out.push({ rotulo: "Percepção passiva", valor: String(10 + percepcao) });
      ATRIBUTOS.forEach(function (a) {
        var prof = c.saves.indexOf(a.id) !== -1;
        out.push({ rotulo: "Salvaguarda " + a.sigla + (prof ? " (prof.)" : ""),
                   valor: hubpgSinal(mod(v[a.id]) + (prof ? PROFICIENCIA : 0)) });
      });
      return out;
    },

    pericias: {
      lista: PERICIAS,
      limite: function (f) {
        var c = classe(f);
        return { total: c.pericias + PERICIAS_ANTECEDENTE,
                 texto: c.nome + " " + c.pericias + " + antecedente " + PERICIAS_ANTECEDENTE };
      },
      calc: function (p, marcada, v) {
        return hubpgSinal(mod(v[p.attr]) + (marcada ? PROFICIENCIA : 0));
      },
      dica: function () { return "Algumas raças e características dão perícias extras: o contador é só uma referência."; }
    },

    avisos: function (f, ctx) {
      var out = [];
      var r = raca(f);
      if (r.nota) out.push(r.nota);
      if (ctx.treino && ctx.treino.usadas > ctx.treino.total) {
        out.push("Você marcou mais perícias do que o previsto (" + ctx.treino.usadas + " de " + ctx.treino.total + "). Se uma raça ou talento deu perícias extras, está tudo certo.");
      }
      return out;
    },

    layout: [
      { tipo: "identidade" },
      { tipo: "avisos" },
      { tipo: "atributos" },
      { tipo: "recursos" },
      { tipo: "derivados" },
      { tipo: "pericias" },
      { tipo: "lista", id: "caracteristicas", titulo: "Características e talentos", campos: HUBPG_CARTAO },
      { tipo: "lista", id: "magias", titulo: "Magias", campos: HUBPG_CARTAO },
      { tipo: "lista", id: "equipamentos", titulo: "Equipamento", campos: HUBPG_CARTAO },
      { tipo: "texto", id: "historia", titulo: "História e personalidade" }
    ]
  };
})();

// ---------------------------------------------------------------------
//  FICHA LIVRE (qualquer outro sistema)
// ---------------------------------------------------------------------
SISTEMAS.livre = {
  id: "livre",
  nome: "Ficha livre",
  tema: null,
  aliases: [],
  resumo: "Ficha em branco: você define atributos, recursos e perícias do jeito do seu sistema.",

  identidade: [
    { id: "nome", rotulo: "Nome" },
    { id: "jogador", rotulo: "Jogador" },
    { id: "classe", rotulo: "Classe / conceito" }
  ],

  layout: [
    { tipo: "identidade" },
    { tipo: "lista", id: "atributos", titulo: "Atributos", campos: [
        { k: "nome", ph: "Nome", tipo: "texto" }, { k: "valor", ph: "Valor", tipo: "numero" }] },
    { tipo: "lista", id: "recursos", titulo: "Recursos (vida, energia, sanidade...)", campos: [
        { k: "nome", ph: "Nome", tipo: "texto" }, { k: "atual", ph: "Atual", tipo: "numero" },
        { k: "max", ph: "Máximo", tipo: "numero" }] },
    { tipo: "lista", id: "pericias", titulo: "Perícias", campos: [
        { k: "nome", ph: "Nome", tipo: "texto" }, { k: "valor", ph: "Valor", tipo: "numero" }] },
    { tipo: "lista", id: "habilidades", titulo: "Habilidades", campos: HUBPG_CARTAO },
    { tipo: "lista", id: "equipamentos", titulo: "Equipamentos", campos: HUBPG_CARTAO },
    { tipo: "texto", id: "historia", titulo: "História e anotações" }
  ]
};

// ---------------------------------------------------------------------
//  Busca de sistema pelo nome digitado na campanha (ou pelo id)
// ---------------------------------------------------------------------
function acharSistema(texto) {
  if (!texto) return SISTEMAS.livre;
  if (Object.prototype.hasOwnProperty.call(SISTEMAS, texto)) return SISTEMAS[texto];
  var n = " " + hubpgNorm(texto) + " ";
  var ids = Object.keys(SISTEMAS);
  var melhor = SISTEMAS.livre, tam = 0;
  for (var i = 0; i < ids.length; i++) {
    var al = SISTEMAS[ids[i]].aliases || [];
    for (var j = 0; j < al.length; j++) {
      var a = hubpgNorm(al[j]);
      // vence o apelido mais longo ("a conduta" ganha de "conduta" ou de "ordem paranormal")
      if (a.length > tam && n.indexOf(" " + a + " ") !== -1) { melhor = SISTEMAS[ids[i]]; tam = a.length; }
    }
  }
  return melhor;
}

var HubPGSistemas = {
  SISTEMAS: SISTEMAS,
  acharSistema: acharSistema,
  nomes: function () {
    return Object.keys(SISTEMAS).filter(function (k) { return k !== "livre"; })
      .map(function (k) { return SISTEMAS[k].nome; });
  }
};
