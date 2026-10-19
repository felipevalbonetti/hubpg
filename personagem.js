(function () {
  "use strict";

  var CHAVE = "hubpg-fichas";
  var H = window.HubPGSistemas;

  var raiz = document.getElementById("ficha");
  var ferr = document.getElementById("ferramentas");
  var sub = document.getElementById("sub-ficha");

  // ---------- utilidades ----------

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }

  function num(v, padrao) {
    var n = parseInt(v, 10);
    return isNaN(n) ? padrao : n;
  }

  function sinal(n) { return (n >= 0 ? "+" : "") + n; }

  function porId(lista, id) {
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  function slug(t) {
    return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "personagem";
  }

  // ---------- contexto da página ----------

  var params = new URLSearchParams(location.search);
  var campanha = null;
  var sis = H.SISTEMAS.livre;
  var campanhaId = "";
  var nuvem = !!(window.HubPGDados && window.HubPGDados.configurado());

  // Roda quando as campanhas chegam (do arquivo ou da nuvem)
  function configurar(lista) {
    campanha = porId(lista, params.get("campanha"));
    sis = H.acharSistema(params.get("sistema") || (campanha && (campanha.sistemaId || campanha.sistema)));
    campanhaId = campanha ? campanha.id : "";

    document.body.setAttribute("data-tema", (campanha && campanha.tema) || sis.tema || "ordem");
    document.title = "Criar personagem · " + sis.nome + " · HubPG";
    sub.textContent = sis.nome + (campanha ? " · " + campanha.titulo : "") + " — " + (sis.resumo || "");
  }

  // ---------- ficha (estado) ----------

  var f;
  var chaveFoco = null;
  var seletor, statusEl;

  function modoAtual() {
    if (!sis.atributos) return null;
    var ms = sis.atributos.modos;
    for (var i = 0; i < ms.length; i++) if (ms[i].id === f.modo) return ms[i];
    return ms[0];
  }

  function novaFicha() {
    var nf = {
      id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      sistema: sis.id, campanha: campanhaId,
      ident: {}, base: {}, extras: {}, pericias: {}, atuais: {}, listas: {}, textos: {},
      maximos: {}, numeros: {}, marcas: {}, escolhas: {}, foto: "",
      modo: sis.atributos ? sis.atributos.modos[0].id : ""
    };
    sis.identidade.forEach(function (c) {
      if (c.tipo === "select") nf.ident[c.id] = c.opcoes[0][0];
    });
    f = nf;
    if (sis.atributos) {
      var m = modoAtual();
      sis.atributos.lista.forEach(function (a) { f.base[a.id] = m.inicio; });
    }
    return nf;
  }

  function normalizar(obj) {
    ["ident", "base", "extras", "pericias", "atuais", "listas", "textos",
     "maximos", "numeros", "marcas", "escolhas"].forEach(function (k) {
      if (!obj[k] || typeof obj[k] !== "object") obj[k] = {};
    });
    if (typeof obj.foto !== "string") obj.foto = "";
    return obj;
  }

  // ---------- armazenamento ----------

  function lerFichas() {
    try { return JSON.parse(localStorage.getItem(CHAVE) || "[]"); } catch (e) { return []; }
  }

  function gravarFichas(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); return true; } catch (e) { return false; }
  }

  function fichasDaCampanha() {
    return lerFichas().filter(function (x) { return x.sistema === sis.id && (x.campanha || "") === campanhaId; });
  }

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  function salvar() {
    f.atualizado = new Date().toISOString();
    var lista = lerFichas(), achou = false;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === f.id) { lista[i] = f; achou = true; break; }
    }
    if (!achou) lista.push(f);
    if (gravarFichas(lista)) {
      var d = new Date();
      setStatus("Salvo neste navegador às " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2));
    } else {
      setStatus("Não consegui salvar neste navegador. Exporte o JSON para não perder a ficha.");
    }
    atualizarSeletor();
  }

  // ---------- cálculo ----------

  function calcular() {
    var ctx = { v: {}, bonus: {}, gasto: 0, restante: null, modo: modoAtual(), treino: null, fixas: [] };
    if (sis.atributos) {
      var m = ctx.modo;
      var bon = sis.bonusAtributos ? sis.bonusAtributos(f) : {};
      sis.atributos.lista.forEach(function (a) {
        var b = num(f.base[a.id], m.inicio);
        ctx.bonus[a.id] = bon[a.id] || 0;
        ctx.v[a.id] = b + ctx.bonus[a.id] + num(f.extras[a.id], 0);
        if (m.custo) ctx.gasto += m.custo(b);
      });
      if (m.orcamento != null) ctx.restante = m.orcamento - ctx.gasto;
    }
    if (sis.pericias) {
      ctx.fixas = sis.pericias.fixas ? sis.pericias.fixas(f) : [];
      var usadas = 0;
      sis.pericias.lista.forEach(function (p) {
        if (f.pericias[p.id] && ctx.fixas.indexOf(p.id) === -1) usadas++;
      });
      var lim = sis.pericias.limite(f, ctx.v);
      ctx.treino = { usadas: usadas, total: lim.total, texto: lim.texto };
    }
    return ctx;
  }

  // ---------- peças da interface ----------

  function bloco(titulo, extraCls) {
    var b = el("section", "ficha-bloco" + (extraCls ? " " + extraCls : ""));
    b.appendChild(el("h3", "faixa", titulo));
    return b;
  }

  function botao(txt, cls, aoClicar, chave, rotuloAria) {
    var b = el("button", cls, txt);
    b.type = "button";
    if (rotuloAria) b.setAttribute("aria-label", rotuloAria);
    if (chave) b.setAttribute("data-chave", chave);
    b.addEventListener("click", function () { chaveFoco = chave || null; aoClicar(); });
    return b;
  }

  // Reduz a imagem escolhida para caber no armazenamento do navegador
  function reduzirImagem(arquivo, pronto) {
    var leitor = new FileReader();
    leitor.onload = function () {
      var im = new Image();
      im.onload = function () {
        var r = Math.min(1, 360 / Math.max(im.width, im.height));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.width * r));
        c.height = Math.max(1, Math.round(im.height * r));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        pronto(c.toDataURL("image/jpeg", 0.85));
      };
      im.onerror = function () { setStatus("Não consegui abrir essa imagem."); };
      im.src = String(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  }

  function blocoRetrato() {
    var box = el("div", "retrato");
    if (f.foto) {
      var img = el("img");
      img.alt = "Retrato do personagem";
      img.src = f.foto;
      box.appendChild(img);
    } else {
      box.appendChild(el("div", "retrato-vazio", "Sem retrato"));
    }
    var arq = el("input");
    arq.type = "file";
    arq.accept = "image/*";
    arq.hidden = true;
    arq.setAttribute("aria-label", "Escolher retrato");
    arq.addEventListener("change", function () {
      var a = arq.files && arq.files[0];
      if (!a) return;
      reduzirImagem(a, function (url) { f.foto = url; salvar(); render(); });
      arq.value = "";
    });
    box.appendChild(arq);
    box.appendChild(botao(f.foto ? "Trocar retrato" : "Adicionar retrato", "btn btn-claro", function () { arq.click(); }));
    if (f.foto) {
      box.appendChild(botao("Remover retrato", "btn btn-claro", function () { f.foto = ""; salvar(); render(); }));
    }
    return box;
  }

  function blocoCampos(titulo, campos, comRetrato) {
    var b = bloco(titulo, "largo");
    var g = el("div", "grade-campos");
    campos.forEach(function (c) {
      var campo = el("div", "campo");
      var lab = el("label", null, c.rotulo);
      var id = "ident-" + c.id;
      lab.setAttribute("for", id);
      var ctl;
      if (c.tipo === "select") {
        ctl = el("select");
        c.opcoes.forEach(function (o) {
          var op = el("option", null, o[1]);
          op.value = o[0];
          ctl.appendChild(op);
        });
        ctl.value = f.ident[c.id] || c.opcoes[0][0];
        ctl.setAttribute("data-chave", id);
        ctl.addEventListener("change", function () {
          f.ident[c.id] = ctl.value; chaveFoco = id; salvar(); render();
        });
      } else {
        ctl = el("input");
        ctl.type = "text";
        ctl.value = f.ident[c.id] || "";
        ctl.addEventListener("input", function () { f.ident[c.id] = ctl.value; salvar(); });
      }
      ctl.id = id;
      campo.appendChild(lab);
      campo.appendChild(ctl);
      g.appendChild(campo);
    });
    if (comRetrato) {
      var env = el("div", "identidade-wrap");
      env.appendChild(g);
      env.appendChild(blocoRetrato());
      b.appendChild(env);
    } else {
      b.appendChild(g);
    }
    return b;
  }

  function blocoIdentidade() { return blocoCampos("Identidade", sis.identidade, !!sis.foto); }

  // Números digitados à mão (defesa, resistências...)
  function blocoNumeros(d) {
    var b = bloco(d.titulo, d.largo ? "largo" : "");
    var g = el("div", "numeros-grid");
    d.itens.forEach(function (it) {
      var c = el("div", "numero");
      var id = "num-" + it.id;
      var lab = el("label", null, it.rotulo);
      lab.setAttribute("for", id);
      var inp = el("input");
      inp.type = "number";
      inp.id = id;
      inp.value = f.numeros[it.id] == null ? "" : f.numeros[it.id];
      inp.addEventListener("input", function () { f.numeros[it.id] = inp.value; salvar(); });
      c.appendChild(lab);
      c.appendChild(inp);
      g.appendChild(c);
    });
    b.appendChild(g);
    return b;
  }

  // Caixinhas de marcar (turnos morrendo, ferida grave...)
  function blocoMarcas(d) {
    var b = bloco(d.titulo, "");
    var g = el("div", "marcas");
    d.grupos.forEach(function (gr) {
      var caixa = el("div", "marca-grupo");
      caixa.appendChild(el("span", "rotulo-marca", gr.rotulo));
      var arr = f.marcas[gr.id] = f.marcas[gr.id] || [];
      var linha = el("span", "caixas");
      for (var i = 0; i < gr.qtd; i++) {
        (function (i) {
          var cb = el("input");
          cb.type = "checkbox";
          cb.checked = !!arr[i];
          cb.setAttribute("aria-label", gr.rotulo + " " + (i + 1));
          cb.addEventListener("change", function () { arr[i] = cb.checked; salvar(); });
          linha.appendChild(cb);
        })(i);
      }
      caixa.appendChild(linha);
      g.appendChild(caixa);
    });
    b.appendChild(g);
    return b;
  }

  // Escolha de uma opção só (tipo de proteção)
  function blocoEscolha(d) {
    var b = bloco(d.titulo, "");
    var g = el("div", "escolha");
    d.opcoes.forEach(function (o) {
      var lab = el("label");
      var r = el("input");
      r.type = "radio";
      r.name = "esc-" + d.id;
      r.value = o[0];
      r.checked = f.escolhas[d.id] === o[0];
      r.addEventListener("change", function () { if (r.checked) { f.escolhas[d.id] = o[0]; salvar(); } });
      lab.appendChild(r);
      lab.appendChild(document.createTextNode(" " + o[1]));
      g.appendChild(lab);
    });
    b.appendChild(g);
    return b;
  }

  function blocoAvisos(ctx) {
    var msgs = sis.avisos ? sis.avisos(f, ctx) : [];
    if (!msgs.length) return null;
    var b = el("section", "ficha-bloco largo avisos-ficha");
    msgs.forEach(function (m) { b.appendChild(el("p", "aviso-linha", m)); });
    return b;
  }

  function mudarAtributo(a, delta, ctx) {
    var m = ctx.modo;
    var atual = num(f.base[a.id], m.inicio);
    var novo = atual + delta;
    if (novo < m.min || novo > m.max) return;
    if (m.orcamento != null && delta > 0 && (m.custo(novo) - m.custo(atual)) > ctx.restante) return;
    f.base[a.id] = novo;
    salvar();
    render();
  }

  function rolar4d6() {
    var m = modoAtual();
    sis.atributos.lista.forEach(function (a) {
      var d = [0, 0, 0, 0].map(function () { return 1 + Math.floor(Math.random() * 6); });
      d.sort(function (x, y) { return x - y; });
      f.base[a.id] = Math.max(m.min, Math.min(m.max, d[1] + d[2] + d[3]));
    });
    salvar();
    render();
  }

  function blocoAtributos(ctx) {
    var cfg = sis.atributos, m = ctx.modo;
    var b = bloco("Atributos", "largo");

    var topo = el("div", "linha-modo");
    if (cfg.modos.length > 1) {
      var sel = el("select");
      sel.setAttribute("aria-label", "Método de distribuição");
      sel.setAttribute("data-chave", "modo");
      cfg.modos.forEach(function (o) {
        var op = el("option", null, o.nome);
        op.value = o.id;
        sel.appendChild(op);
      });
      sel.value = m.id;
      sel.addEventListener("change", function () {
        f.modo = sel.value;
        var novo = modoAtual();
        cfg.lista.forEach(function (a) { f.base[a.id] = novo.inicio; });
        chaveFoco = "modo";
        salvar();
        render();
      });
      topo.appendChild(sel);
    }
    if (m.rolagem) topo.appendChild(botao("Rolar 4d6 (descarta o menor)", "btn btn-claro", rolar4d6, "rolar"));
    if (m.orcamento != null) {
      topo.appendChild(el("span", "orcamento", "Pontos restantes: " + ctx.restante + " de " + m.orcamento));
    }
    b.appendChild(topo);
    b.appendChild(el("p", "ajuda", m.dica || ""));

    var grade = el("div", "atributos-grid");
    cfg.lista.forEach(function (a) {
      var t = el("div", "atributo");
      t.appendChild(el("div", "sigla", a.sigla));
      t.appendChild(el("div", "valor", String(ctx.v[a.id])));
      if (cfg.modificador) t.appendChild(el("div", "mod", sinal(cfg.modificador(ctx.v[a.id]))));
      t.appendChild(el("div", "nome", a.nome));
      if (ctx.bonus[a.id]) {
        t.appendChild(el("div", "nome", "base " + num(f.base[a.id], m.inicio) + " + raça " + ctx.bonus[a.id]));
      }
      var ctl = el("div", "controles");
      ctl.appendChild(botao("−", "mini", function () { mudarAtributo(a, -1, ctx); }, "menos-" + a.id, "Diminuir " + a.nome));
      ctl.appendChild(botao("+", "mini", function () { mudarAtributo(a, 1, ctx); }, "mais-" + a.id, "Aumentar " + a.nome));
      t.appendChild(ctl);
      if (cfg.extra) {
        var ex = el("label", "extra", "extra ");
        var inp = el("input");
        inp.type = "number";
        inp.value = String(num(f.extras[a.id], 0));
        inp.setAttribute("aria-label", "Bônus extra de " + a.nome);
        inp.addEventListener("change", function () {
          f.extras[a.id] = num(inp.value, 0); salvar(); render();
        });
        ex.appendChild(inp);
        t.appendChild(ex);
      }
      grade.appendChild(t);
    });
    b.appendChild(grade);
    return b;
  }

  function blocoRecursos(ctx) {
    var b = bloco("Pontos", "");
    sis.recursos(f, ctx.v).forEach(function (r) {
      var manualMax = r.max == null;          // sem fórmula: o máximo é digitado
      var mx = manualMax ? num(f.maximos[r.id], 0) : r.max;
      var atual = f.atuais[r.id] == null ? mx : f.atuais[r.id];
      var v = el("div", "vital");
      var linha = el("div", "topo-vital");
      linha.appendChild(el("strong", null, r.rotulo + " — " + r.nome));
      var par = el("span");
      var inp = el("input");
      inp.type = "number";
      inp.min = "0";
      inp.value = String(atual);
      inp.className = "atual";
      inp.setAttribute("aria-label", r.nome + " atual");
      par.appendChild(inp);
      var maxInp = null;
      if (manualMax) {
        par.appendChild(document.createTextNode(" / "));
        maxInp = el("input");
        maxInp.type = "number";
        maxInp.min = "0";
        maxInp.value = String(mx);
        maxInp.className = "atual";
        maxInp.setAttribute("aria-label", r.nome + " máximo");
        par.appendChild(maxInp);
      } else {
        par.appendChild(document.createTextNode(" / " + mx));
      }
      linha.appendChild(par);
      v.appendChild(linha);
      var barra = el("div", "barra");
      var enche = el("i");
      barra.appendChild(enche);
      v.appendChild(barra);
      function pintar(n) {
        enche.style.width = (mx > 0 ? Math.max(0, Math.min(100, n / mx * 100)) : 0) + "%";
      }
      pintar(atual);
      inp.addEventListener("input", function () {
        var n = num(inp.value, mx);
        f.atuais[r.id] = n;
        pintar(n);
        salvar();
      });
      if (maxInp) {
        maxInp.addEventListener("input", function () {
          mx = Math.max(0, num(maxInp.value, 0));
          f.maximos[r.id] = mx;
          if (f.atuais[r.id] == null) inp.value = String(mx);   // enquanto não mexeu, a barra fica cheia
          pintar(f.atuais[r.id] == null ? mx : f.atuais[r.id]);
          salvar();
        });
      }
      b.appendChild(v);
    });
    return b;
  }

  function blocoDerivados(ctx) {
    var itens = sis.derivados ? sis.derivados(f, ctx.v) : [];
    if (!itens.length) return null;
    var b = bloco("Valores calculados", "largo");
    var g = el("div", "derivados");
    itens.forEach(function (d) {
      var c = el("div", "derivado");
      c.appendChild(el("div", "rotulo", d.rotulo));
      c.appendChild(el("div", "valor", d.valor));
      g.appendChild(c);
    });
    b.appendChild(g);
    return b;
  }

  function itemPericia(p, ctx) {
    var cfg = sis.pericias;
    var fixa = ctx.fixas.indexOf(p.id) !== -1;
    var marcada = fixa || !!f.pericias[p.id];
    var li = el("li", "pericia" + (marcada ? " marcada" : ""));
    var lab = el("label");
    var cb = el("input");
    cb.type = "checkbox";
    cb.checked = marcada;
    cb.disabled = fixa;
    cb.setAttribute("data-chave", "per-" + p.id);
    cb.addEventListener("change", function () {
      f.pericias[p.id] = cb.checked; chaveFoco = "per-" + p.id; salvar(); render();
    });
    lab.appendChild(cb);
    lab.appendChild(el("span", "nome-p", " " + p.nome + (p.so ? "*" : "")));
    li.appendChild(lab);
    if (!cfg.agrupar) {
      var a = porId(sis.atributos.lista, p.attr);
      li.appendChild(el("span", "attr", a ? a.sigla : ""));
    }
    li.appendChild(el("span", "res", cfg.calc(p, marcada, ctx.v, f)));
    return li;
  }

  function blocoPericias(ctx) {
    var cfg = sis.pericias;
    var t = ctx.treino;
    var b = bloco("Perícias", "largo");
    var texto = t.total == null
      ? "Perícias treinadas: " + t.usadas
      : "Perícias treinadas: " + t.usadas + " de " + t.total + "  (" + t.texto + ")";
    b.appendChild(el("p", "orcamento" + (t.total != null && t.usadas > t.total ? " ruim" : ""), texto));
    var dica = cfg.dica ? cfg.dica(f) : "";
    if (dica) b.appendChild(el("p", "ajuda", dica));
    if (cfg.lista.some(function (p) { return p.so; })) {
      b.appendChild(el("p", "ajuda", "* só pode ser usada por quem é treinado nela."));
    }

    if (cfg.agrupar) {
      // uma coluna por atributo, como na ficha de papel
      var grupos = el("div", "pericias-grupos");
      sis.atributos.lista.forEach(function (a) {
        var itens = cfg.lista.filter(function (p) { return p.attr === a.id; });
        if (!itens.length) return;
        var g = el("div", "grupo-pericias");
        g.appendChild(el("h4", null, a.nome));
        var ulg = el("ul", "pericias");
        itens.forEach(function (p) { ulg.appendChild(itemPericia(p, ctx)); });
        g.appendChild(ulg);
        grupos.appendChild(g);
      });
      b.appendChild(grupos);
      return b;
    }

    var ul = el("ul", "pericias");
    cfg.lista.forEach(function (p) { ul.appendChild(itemPericia(p, ctx)); });
    b.appendChild(ul);
    return b;
  }

  function blocoLista(desc) {
    var b = bloco(desc.titulo, desc.largo === false ? "" : "largo");
    var itens = f.listas[desc.id] = f.listas[desc.id] || [];
    if (!itens.length) b.appendChild(el("p", "vazio", "Nada por aqui ainda."));
    itens.forEach(function (it, idx) {
      var linha = el("div", "item-lista");
      desc.campos.forEach(function (c) {
        var inp = c.tipo === "area" ? el("textarea") : el("input");
        if (c.tipo !== "area") inp.type = c.tipo === "numero" ? "number" : "text";
        inp.value = it[c.k] == null ? "" : it[c.k];
        inp.placeholder = c.ph;
        inp.className = "campo-" + c.k;
        inp.setAttribute("aria-label", c.ph + " (" + desc.titulo + " " + (idx + 1) + ")");
        inp.addEventListener("input", function () { it[c.k] = inp.value; salvar(); });
        linha.appendChild(inp);
      });
      linha.appendChild(botao("Remover", "btn btn-claro", function () {
        itens.splice(idx, 1); salvar(); render();
      }, "rem-" + desc.id + "-" + idx));
      b.appendChild(linha);
    });
    b.appendChild(botao("+ Adicionar", "btn", function () {
      itens.push({}); salvar(); render();
    }, "add-" + desc.id));
    return b;
  }

  function blocoTexto(desc) {
    var b = bloco(desc.titulo, "largo");
    var ta = el("textarea", "texto-livre");
    ta.value = f.textos[desc.id] || "";
    ta.setAttribute("aria-label", desc.titulo);
    ta.addEventListener("input", function () { f.textos[desc.id] = ta.value; salvar(); });
    b.appendChild(ta);
    return b;
  }

  // ---------- desenho da ficha ----------

  function render() {
    var ctx = calcular();
    raiz.textContent = "";
    var grade = el("div", "ficha-grade");
    sis.layout.forEach(function (d) {
      var no = null;
      if (d.tipo === "identidade") no = blocoIdentidade();
      else if (d.tipo === "avisos") no = blocoAvisos(ctx);
      else if (d.tipo === "atributos") no = blocoAtributos(ctx);
      else if (d.tipo === "recursos") no = blocoRecursos(ctx);
      else if (d.tipo === "derivados") no = blocoDerivados(ctx);
      else if (d.tipo === "pericias") no = blocoPericias(ctx);
      else if (d.tipo === "lista") no = blocoLista(d);
      else if (d.tipo === "texto") no = blocoTexto(d);
      else if (d.tipo === "campos") no = blocoCampos(d.titulo, d.itens, false);
      else if (d.tipo === "numeros") no = blocoNumeros(d);
      else if (d.tipo === "marcas") no = blocoMarcas(d);
      else if (d.tipo === "escolha") no = blocoEscolha(d);
      if (no) grade.appendChild(no);
    });
    raiz.appendChild(grade);

    if (chaveFoco) {
      var alvo = raiz.querySelector('[data-chave="' + chaveFoco + '"]');
      if (alvo && alvo.focus) alvo.focus();
      chaveFoco = null;
    }
  }

  // ---------- barra de ferramentas ----------

  function rotuloFicha(x) {
    return (x.ident && x.ident.nome) || "Sem nome";
  }

  function atualizarSeletor() {
    if (!seletor) return;
    seletor.textContent = "";
    var novo = el("option", null, "— Novo personagem —");
    novo.value = "";
    seletor.appendChild(novo);
    fichasDaCampanha().forEach(function (x) {
      var op = el("option", null, rotuloFicha(x));
      op.value = x.id;
      seletor.appendChild(op);
    });
    seletor.value = lerFichas().some(function (x) { return x.id === f.id; }) ? f.id : "";
  }

  function textoOpcao(campoId, valor) {
    var c = null;
    sis.identidade.forEach(function (x) { if (x.id === campoId) c = x; });
    if (!c) return valor || "";
    if (c.tipo === "select") {
      var r = valor;
      c.opcoes.forEach(function (o) { if (o[0] === valor) r = o[1]; });
      return r;
    }
    return valor || "";
  }

  function resumoParaCampanha() {
    var classe = textoOpcao("classe", f.ident.classe) || f.ident["arvore-classe"] || "";
    var hist = (f.textos.historia || "").replace(/\s+/g, " ").trim();
    var obj = {
      nome: f.ident.nome || "Sem nome",
      jogador: f.ident.jogador || "",
      classe: classe,
      descricao: hist.length > 140 ? hist.slice(0, 137) + "..." : hist
    };
    return JSON.stringify(obj, null, 2);
  }

  function copiarResumo() {
    var texto = resumoParaCampanha();
    function plano() {
      window.prompt(nuvem ? "Copie este bloco e use \"Colar personagem\" no painel admin:"
                          : "Copie este bloco e cole em personagens, no campanhas.js:", texto);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(
        function () {
          setStatus(nuvem
            ? "Resumo copiado. No painel admin, edite a campanha e use \"Colar personagem\"."
            : "Resumo copiado. Cole em \"personagens\" da campanha, no campanhas.js.");
        },
        plano
      );
    } else {
      plano();
    }
  }

  function exportar() {
    var blob = new Blob([JSON.stringify(f, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = slug(f.ident.nome) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importar(arquivo) {
    var leitor = new FileReader();
    leitor.onload = function () {
      var obj;
      try { obj = JSON.parse(String(leitor.result)); } catch (e) { setStatus("Arquivo inválido."); return; }
      if (!obj || typeof obj !== "object" || Array.isArray(obj) || obj.sistema !== sis.id) {
        setStatus("Esse arquivo é de outro sistema" + (obj && obj.sistema ? " (" + obj.sistema + ")" : "") + ".");
        return;
      }
      obj.id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      obj.campanha = campanhaId;
      f = normalizar(obj);
      salvar();
      render();
    };
    leitor.readAsText(arquivo);
  }

  function montarFerramentas() {
    ferr.textContent = "";
    var voltar = el("a", "btn btn-claro", "← Campanha");
    voltar.href = campanha ? "index.html#" + encodeURIComponent(campanha.id) : "index.html";
    ferr.appendChild(voltar);

    seletor = el("select");
    seletor.setAttribute("aria-label", "Meus personagens");
    seletor.addEventListener("change", function () {
      if (!seletor.value) { novaFicha(); render(); atualizarSeletor(); setStatus("Nova ficha em branco."); return; }
      var achada = null;
      lerFichas().forEach(function (x) { if (x.id === seletor.value) achada = x; });
      if (achada) { f = normalizar(achada); render(); setStatus("Ficha carregada."); }
    });
    ferr.appendChild(seletor);

    ferr.appendChild(botao("Novo", "btn btn-claro", function () {
      novaFicha(); render(); atualizarSeletor(); setStatus("Nova ficha em branco.");
    }));
    ferr.appendChild(botao("Exportar JSON", "btn btn-claro", exportar));

    var arq = el("input");
    arq.type = "file";
    arq.accept = "application/json,.json";
    arq.hidden = true;
    arq.setAttribute("aria-label", "Importar ficha em JSON");
    arq.addEventListener("change", function () {
      if (arq.files && arq.files[0]) importar(arq.files[0]);
      arq.value = "";
    });
    ferr.appendChild(arq);
    ferr.appendChild(botao("Importar JSON", "btn btn-claro", function () { arq.click(); }));

    ferr.appendChild(botao("Copiar resumo", "btn btn-claro", copiarResumo));
    ferr.appendChild(botao("Imprimir", "btn btn-claro", function () { window.print(); }));

    statusEl = el("span", "status-salvo", "Nada salvo ainda.");
    statusEl.setAttribute("role", "status");
    ferr.appendChild(statusEl);
  }

  // ---------- início ----------

  function iniciar(lista) {
    configurar(lista);
    novaFicha();
    montarFerramentas();
    atualizarSeletor();
    render();

    window.HubPGFicha = {
      estado: function () { return f; },
      sistema: sis,
      calcular: calcular,
      resumoParaCampanha: resumoParaCampanha
    };
  }

  var D = window.HubPGDados;
  (D ? D.carregar() : Promise.resolve({ lista: (typeof CAMPANHAS !== "undefined" && CAMPANHAS) || [] }))
    .then(function (r) { iniciar(r.lista); });
})();
