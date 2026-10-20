// Utilitários do painel admin (temas e geração de identificadores).
(function () {
  "use strict";

  var TEMAS = [
    ["ordem", "Ordem Paranormal (preto e branco)"],
    ["fantasia", "Fantasia medieval"],
    ["cyberpunk", "Cyberpunk"],
    ["terror", "Terror"],
    ["espaco", "Ficção científica / espaço"],
    ["sangue", "Escuro e vermelho (ficha digital)"]
  ];

  function slug(texto) {
    return String(texto || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "campanha";
  }

  function idUnico(titulo, lista) {
    var base = slug(titulo), id = base, n = 2;
    var usados = lista.map(function (c) { return c.id; });
    while (usados.indexOf(id) !== -1) { id = base + "-" + n; n++; }
    return id;
  }

  window.HubPGAdmin = { slug: slug, idUnico: idUnico, TEMAS: TEMAS };
})();
