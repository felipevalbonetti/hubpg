(function () {
  "use strict";

  var menu = document.getElementById("menu");
  var conteudo = document.getElementById("conteudo");

  // Cria um elemento com classe e texto. Usar textContent evita problemas com caracteres especiais.
  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  function linhaInfo(rotulo, valor) {
    var d = el("div");
    d.appendChild(el("span", null, rotulo));
    d.appendChild(document.createTextNode(valor || "—"));
    return d;
  }

  function formatarData(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] : (iso || "");
  }

  function montarMenu(lista, ativoId) {
    menu.textContent = "";
    lista.forEach(function (c) {
      var a = el("a", null, c.titulo);
      a.href = "#" + c.id;
      if (c.id === ativoId) a.setAttribute("aria-current", "true");
      menu.appendChild(a);
    });
  }

  function montarCampanha(c) {
    var sec = el("section", "campanha");
    sec.id = "campanha-" + c.id;

    sec.appendChild(el("h2", "faixa", c.titulo));

    var info = el("div", "ficha-info");
    info.appendChild(linhaInfo("Sistema:", c.sistema));
    info.appendChild(linhaInfo("Mestre:", c.mestre));
    var st = el("div");
    st.appendChild(el("span", null, "Status:"));
    st.appendChild(el("span", "status", c.status || "—"));
    info.appendChild(st);
    sec.appendChild(info);

    var acoes = el("div", "acoes");
    var s = (typeof HubPGSistemas !== "undefined") ? HubPGSistemas.acharSistema(c.sistemaId || c.sistema) : null;
    var rotuloBotao = "Criar personagem" + (s ? " · " + (s.id === "livre" ? "ficha livre" : s.nome) : "");
    var criar = el("a", "btn", rotuloBotao);
    criar.href = "personagem.html?campanha=" + encodeURIComponent(c.id);
    acoes.appendChild(criar);
    sec.appendChild(acoes);

    var bResumo = el("div", "bloco");
    bResumo.appendChild(el("h3", "faixa", "Resumo"));
    bResumo.appendChild(el("p", "resumo", c.resumo || ""));
    sec.appendChild(bResumo);

    var bPers = el("div", "bloco");
    bPers.appendChild(el("h3", "faixa", "Personagens"));
    if (c.personagens && c.personagens.length) {
      var grade = el("div", "personagens");
      c.personagens.forEach(function (p) {
        var cartao = el("article", "cartao");
        cartao.appendChild(el("h4", null, p.nome));
        var meta = [p.classe, p.jogador ? "jogador: " + p.jogador : ""].filter(Boolean).join(" · ");
        cartao.appendChild(el("p", "meta", meta));
        if (p.descricao) cartao.appendChild(el("p", null, p.descricao));
        grade.appendChild(cartao);
      });
      bPers.appendChild(grade);
    } else {
      bPers.appendChild(el("p", "vazio", "Nenhum personagem registrado ainda."));
    }
    sec.appendChild(bPers);

    var bSes = el("div", "bloco");
    bSes.appendChild(el("h3", "faixa", "Diário de sessões"));
    if (c.sessoes && c.sessoes.length) {
      var ol = el("ol", "sessoes");
      c.sessoes.slice().sort(function (a, b) { return (b.numero || 0) - (a.numero || 0); })
        .forEach(function (s) {
          var li = el("li", "sessao");
          li.appendChild(el("h4", null, "Sessão " + (s.numero || "") + (s.titulo ? " — " + s.titulo : "")));
          if (s.data) li.appendChild(el("div", "data", formatarData(s.data)));
          li.appendChild(el("p", null, s.texto || ""));
          ol.appendChild(li);
        });
      bSes.appendChild(ol);
    } else {
      bSes.appendChild(el("p", "vazio", "Nenhuma sessão registrada ainda."));
    }
    sec.appendChild(bSes);

    return sec;
  }

  function mostrar() {
    var lista = (typeof CAMPANHAS !== "undefined" && CAMPANHAS) || [];
    conteudo.textContent = "";

    if (!lista.length) {
      conteudo.appendChild(el("p", "vazio", "Nenhuma campanha cadastrada. Edite o arquivo campanhas.js."));
      menu.textContent = "";
      return;
    }

    var id = decodeURIComponent(location.hash.replace(/^#/, ""));
    var atual = lista.filter(function (c) { return c.id === id; })[0] || lista[0];

    montarMenu(lista, atual.id);
    conteudo.appendChild(montarCampanha(atual));
    document.body.setAttribute("data-tema", atual.tema || "ordem");
    document.title = atual.titulo + " · HubPG";
  }

  window.addEventListener("hashchange", function () {
    mostrar();
    window.scrollTo(0, 0);
  });

  mostrar();
})();
