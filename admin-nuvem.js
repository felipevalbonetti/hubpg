// =====================================================================
//  PAINEL ADMIN COM LOGIN (Firebase)
//  Criar conta / entrar com nome de usuário e senha (ou com o Google);
//  qualquer conta logada pode editar. As campanhas ficam no Firestore.
// =====================================================================
(function () {
  "use strict";

  var D = window.HubPGDados;
  var A = window.HubPGAdmin;
  if (!D || !A) return;
  if (!D.configurado()) {
    // Sem Firebase não existe onde guardar contas nem campanhas: explica em vez de ficar em branco
    $("carregando").hidden = true;
    $("sem-config").hidden = false;
    return;
  }

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }

  var S = { fb: null, auth: null, db: null, user: null, lista: [], remotos: [], sujo: false, criando: false };
  var seq = 0;
  var avaliacao = 0;

  // ---------- mensagens ----------

  function aviso(msg, ok) {
    var a = $("aviso");
    if (!msg) { a.hidden = true; return; }
    a.textContent = msg;
    a.className = "aviso" + (ok ? " ok" : "");
    a.hidden = false;
  }

  function msgErro(e) {
    var c = (e && e.code) || "";
    var igual = "Usuário ou senha incorretos.";
    var m = {
      "auth/invalid-email": "Nome de usuário inválido.",
      "auth/missing-password": "Digite a senha.",
      "auth/weak-password": "Senha fraca: use pelo menos 6 caracteres.",
      "auth/email-already-in-use": "Esse nome de usuário já existe. Escolha outro ou clique em \"Entrar\".",
      "auth/invalid-credential": igual,
      "auth/wrong-password": igual,
      "auth/user-not-found": igual,
      "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
      "auth/network-request-failed": "Sem conexão com o Firebase. Confira a sua internet.",
      "auth/popup-closed-by-user": "A janela do Google foi fechada antes de terminar.",
      "auth/cancelled-popup-request": "A janela do Google foi cancelada. Tente de novo.",
      "auth/unauthorized-domain": "Este endereço (" + location.hostname + ") não está autorizado no Firebase. " +
        "Adicione em Authentication → Settings → Authorized domains.",
      "auth/operation-not-allowed": "Esse tipo de login não está ativado no Firebase (Authentication → Sign-in method).",
      "auth/user-disabled": "Essa conta foi desativada.",
      "permission-denied": "O banco recusou a gravação. Confira se as regras do Firestore do arquivo firestore.rules foram publicadas."
    };
    return m[c] || ("Algo deu errado" + (c ? " (" + c + ")" : "") + ".");
  }

  function telas(nome) {
    ["n-aguarde", "n-entrada", "n-painel"].forEach(function (id) {
      $(id).hidden = (id !== nome);
    });
  }

  // O Firebase só entende e-mail: o nome de usuário vira um e-mail interno (nunca é enviado nada para ele)
  var DOMINIO = "@hubpg.user";

  function usuarioParaEmail(u) {
    u = String(u || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(u) || /[._-]$/.test(u)) return null;
    return u + DOMINIO;
  }

  function nomeDaConta(user) {
    var e = (user && user.email) || "";
    if (e.slice(-DOMINIO.length) === DOMINIO) return e.slice(0, -DOMINIO.length);
    return (user && (user.displayName || user.email)) || "";
  }

  // ---------- entrar ----------

  function aba(criar) {
    S.criando = criar;
    $("campo-senha2").hidden = !criar;
    $("btn-email").textContent = criar ? "Criar conta" : "Entrar";
    $("aba-entrar").className = "btn" + (criar ? " btn-claro" : "");
    $("aba-criar").className = "btn" + (criar ? "" : " btn-claro");
    $("n-senha").setAttribute("autocomplete", criar ? "new-password" : "current-password");
    aviso("");
  }

  function porUsuario() {
    aviso("");
    var usuario = $("n-usuario").value;
    var senha = $("n-senha").value;
    if (!usuario.trim() || !senha) { aviso("Preencha o nome de usuário e a senha."); return; }
    var email = usuarioParaEmail(usuario);
    if (!email) {
      aviso("Nome de usuário: de 3 a 30 caracteres, só letras sem acento, números, ponto, hífen e sublinhado, começando por letra ou número.");
      return;
    }
    var p;
    if (S.criando) {
      if (senha.length < 6) { aviso(msgErro({ code: "auth/weak-password" })); return; }
      if (senha !== $("n-senha2").value) { aviso("As duas senhas não são iguais."); return; }
      p = S.auth.createUserWithEmailAndPassword(email, senha);
    } else {
      p = S.auth.signInWithEmailAndPassword(email, senha);
    }
    var b = $("btn-email");
    b.disabled = true;
    p.catch(function (e) { aviso(msgErro(e)); }).then(function () {
      b.disabled = false;
      $("n-senha").value = "";
      $("n-senha2").value = "";
    });
  }

  function porGoogle() {
    aviso("");
    var prov = new S.fb.auth.GoogleAuthProvider();
    S.auth.signInWithPopup(prov).catch(function (e) {
      if (e && e.code === "auth/popup-blocked") return S.auth.signInWithRedirect(prov);
      throw e;
    }).catch(function (e) { aviso(msgErro(e)); });
  }

  function sair() {
    if (S.sujo && !confirm("Há mudanças não salvas. Sair mesmo assim?")) return;
    marcarSujo(false);
    S.auth.signOut();
  }

  // ---------- quem está logado ----------

  function avaliarUsuario(user) {
    var id = ++avaliacao;
    S.user = user;
    aviso("");
    if (!user) {
      S.lista = [];
      S.remotos = [];
      marcarSujo(false);
      fecharEditor();
      telas("n-entrada");
      return;
    }
    telas("n-aguarde");
    carregarLista().catch(function (e) {
      if (id !== avaliacao) return;
      aviso(msgErro(e));
      telas("n-entrada");
    });
  }

  function carregarLista() {
    return D.lerCampanhas(S.db).then(function (lista) {
      S.lista = lista;
      S.remotos = lista.map(function (c) { return c.id; });
      marcarSujo(false);
      $("n-quem").textContent = nomeDaConta(S.user);
      telas("n-painel");
      desenharLista();
    });
  }

  // ---------- lista de campanhas ----------

  function marcarSujo(v) {
    S.sujo = v;
    $("n-salvar").disabled = !v;
  }

  function botao(txt, cls, aoClicar) {
    var b = el("button", cls, txt);
    b.type = "button";
    b.addEventListener("click", aoClicar);
    return b;
  }

  function desenharLista() {
    var ul = $("n-lista");
    ul.textContent = "";
    if (!S.lista.length) ul.appendChild(el("li", null, "Nenhuma campanha ainda."));
    S.lista.forEach(function (c, idx) {
      var li = el("li");
      var info = el("div");
      info.appendChild(el("div", "nome", c.titulo));
      info.appendChild(el("div", "detalhe",
        [c.sistema, c.status, "tema: " + (c.tema || "ordem"),
         (c.personagens || []).length + " personagens", (c.sessoes || []).length + " sessões"]
          .filter(Boolean).join(" · ")));
      var acoes = el("div", "acoes-linha");
      acoes.appendChild(botao("Editar", "btn btn-claro", function () { abrirEditor(idx, false); }));
      acoes.appendChild(botao("Remover", "btn btn-claro", function () {
        if (!confirm("Remover a campanha \"" + c.titulo + "\"? Isso só vale depois de salvar.")) return;
        S.lista.splice(idx, 1);
        fecharEditor();
        marcarSujo(true);
        desenharLista();
      }));
      li.appendChild(info);
      li.appendChild(acoes);
      ul.appendChild(li);
    });
    // se o banco está vazio e existe o arquivo antigo, oferece importar
    $("n-importar").hidden = !(S.lista.length === 0 && D.doArquivo().length > 0);
  }

  // ---------- editor ----------

  function fecharEditor() {
    var box = $("n-editor");
    box.textContent = "";
    box.hidden = true;
  }

  function campo(rotulo, ctl) {
    var d = el("div", "campo");
    var l = el("label", null, rotulo);
    var id = "ed-" + (++seq);
    l.setAttribute("for", id);
    ctl.id = id;
    d.appendChild(l);
    d.appendChild(ctl);
    return d;
  }

  function entrada(tipo, valor, aoMudar) {
    var i = el("input");
    i.type = tipo;
    i.value = valor == null ? "" : valor;
    i.addEventListener("input", function () { aoMudar(i.value); });
    return i;
  }

  function seletor(opcoes, valor, aoMudar) {
    var s = el("select");
    opcoes.forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      s.appendChild(op);
    });
    s.value = valor;
    s.addEventListener("change", function () { aoMudar(s.value); });
    return s;
  }

  // Lista editável (personagens ou sessões). defs: [{ k, ph, tipo?, area? }]
  function repetidor(titulo, arr, defs, novoItem, extra) {
    var b = el("div", "bloco-ed");
    b.appendChild(el("h3", "faixa", titulo));
    var corpo = el("div");
    b.appendChild(corpo);

    function desenhar() {
      corpo.textContent = "";
      if (!arr.length) corpo.appendChild(el("p", "vazio", "Nada por aqui ainda."));
      arr.forEach(function (item, i) {
        var linha = el("div", "item-lista");
        defs.forEach(function (d) {
          var ctl = d.area ? el("textarea") : el("input");
          if (!d.area) ctl.type = d.tipo || "text";
          ctl.placeholder = d.ph;
          ctl.className = "campo-" + d.k;
          ctl.setAttribute("aria-label", d.ph + " (" + titulo + " " + (i + 1) + ")");
          ctl.value = item[d.k] == null ? "" : item[d.k];
          ctl.addEventListener("input", function () {
            item[d.k] = (d.tipo === "number" && ctl.value !== "") ? Number(ctl.value) : ctl.value;
          });
          linha.appendChild(ctl);
        });
        linha.appendChild(botao("Remover", "btn btn-claro", function () { arr.splice(i, 1); desenhar(); }));
        corpo.appendChild(linha);
      });
    }

    b.appendChild(botao("+ Adicionar", "btn", function () { arr.push(novoItem(arr)); desenhar(); }));
    if (extra) b.appendChild(extra(arr, desenhar));
    desenhar();
    return b;
  }

  function hoje() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  function abrirEditor(idx, novo) {
    var c = JSON.parse(JSON.stringify(S.lista[idx]));
    c.personagens = c.personagens || [];
    c.sessoes = c.sessoes || [];
    var box = $("n-editor");
    box.textContent = "";
    box.hidden = false;
    box.appendChild(el("h2", "faixa", novo ? "Nova campanha" : "Editar campanha"));

    var g = el("div", "grade-campos");
    g.appendChild(campo("Título *", entrada("text", c.titulo, function (v) { c.titulo = v; })));
    var sis = entrada("text", c.sistema, function (v) { c.sistema = v; });
    sis.setAttribute("list", "n-lista-sistemas");
    g.appendChild(campo("Sistema de RPG", sis));
    g.appendChild(campo("Mestre", entrada("text", c.mestre, function (v) { c.mestre = v; })));
    g.appendChild(campo("Status", seletor(
      [["Em andamento", "Em andamento"], ["Pausada", "Pausada"], ["Encerrada", "Encerrada"]],
      c.status || "Em andamento", function (v) { c.status = v; })));
    g.appendChild(campo("Tema visual", seletor(A.TEMAS, c.tema || "ordem", function (v) { c.tema = v; })));
    box.appendChild(g);

    var resumo = el("textarea");
    resumo.value = c.resumo || "";
    resumo.addEventListener("input", function () { c.resumo = resumo.value; });
    box.appendChild(campo("Resumo da campanha", resumo));

    box.appendChild(repetidor("Personagens", c.personagens, [
      { k: "nome", ph: "Nome" }, { k: "jogador", ph: "Jogador" },
      { k: "classe", ph: "Classe / arquétipo" }, { k: "descricao", ph: "Descrição", area: true }
    ], function () { return {}; }, function (arr, desenhar) {
      return botao("Colar personagem (JSON)", "btn btn-claro", function () {
        var t = window.prompt("Cole aqui o resumo copiado da ficha (botão \"Copiar resumo\"):");
        if (!t) return;
        try {
          var o = JSON.parse(t);
          if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("formato");
          arr.push({ nome: o.nome || "", jogador: o.jogador || "", classe: o.classe || "", descricao: o.descricao || "" });
          desenhar();
        } catch (e) { aviso("Esse texto não parece um resumo de personagem."); }
      });
    }));

    box.appendChild(repetidor("Diário de sessões", c.sessoes, [
      { k: "numero", ph: "Nº", tipo: "number" }, { k: "titulo", ph: "Título da sessão" },
      { k: "data", ph: "Data", tipo: "date" }, { k: "texto", ph: "O que aconteceu", area: true }
    ], function (arr) {
      var max = 0;
      arr.forEach(function (s) { if (Number(s.numero) > max) max = Number(s.numero); });
      return { numero: max + 1, data: hoje() };
    }));

    var rodape = el("div", "acoes-editor");
    rodape.appendChild(botao("Concluir edição", "btn", function () {
      c.titulo = String(c.titulo || "").trim();
      if (!c.titulo) { aviso("A campanha precisa de um título."); return; }
      var outras = S.lista.filter(function (x, j) { return j !== idx; });
      if (novo) c.id = A.idUnico(c.titulo, outras);
      c.sistemaId = window.HubPGSistemas ? window.HubPGSistemas.acharSistema(c.sistema).id : "livre";
      c.personagens = c.personagens.filter(function (p) { return p.nome; });
      c.sessoes = c.sessoes.filter(function (s) { return s.titulo || s.texto; });
      S.lista[idx] = c;
      marcarSujo(true);
      fecharEditor();
      desenharLista();
      aviso("Alterações guardadas na lista. Clique em \"Salvar na nuvem\" para publicar.", true);
    }));
    rodape.appendChild(botao("Cancelar", "btn btn-claro", function () {
      if (novo) S.lista.splice(idx, 1);
      fecharEditor();
      desenharLista();
      aviso("");
    }));
    box.appendChild(rodape);
    box.scrollIntoView && box.scrollIntoView({ block: "nearest" });
  }

  function novaCampanha() {
    fecharEditor();
    S.lista.push({
      id: "nova", titulo: "", sistema: "", sistemaId: "livre", mestre: "", status: "Em andamento",
      tema: "ordem", resumo: "", personagens: [], sessoes: []
    });
    abrirEditor(S.lista.length - 1, true);
  }

  function importarArquivo() {
    S.lista = JSON.parse(JSON.stringify(D.doArquivo()));
    marcarSujo(true);
    desenharLista();
    aviso("Campanhas do campanhas.js trazidas para a lista. Clique em \"Salvar na nuvem\" para publicar.", true);
  }

  // ---------- salvar ----------

  function salvar() {
    aviso("");
    var b = $("n-salvar");
    b.disabled = true;
    var col = S.db.collection("campanhas");
    var batch = S.db.batch();
    S.lista.forEach(function (c, i) {
      var d = JSON.parse(JSON.stringify(c));   // o Firestore não aceita valores undefined
      d.ordem = i;
      batch.set(col.doc(c.id), d);
    });
    S.remotos.forEach(function (id) {
      if (!S.lista.some(function (c) { return c.id === id; })) batch.delete(col.doc(id));
    });
    batch.commit().then(function () {
      S.remotos = S.lista.map(function (c) { return c.id; });
      marcarSujo(false);
      aviso("Salvo na nuvem. O site já mostra as mudanças.", true);
    }, function (e) {
      marcarSujo(true);
      aviso(msgErro(e));
    });
  }

  // ---------- início ----------

  function iniciar() {
    $("carregando").hidden = true;
    $("modo-nuvem").hidden = false;
    telas("n-aguarde");

    if (window.HubPGSistemas) {
      window.HubPGSistemas.nomes().forEach(function (n) {
        var o = el("option");
        o.value = n;
        $("n-lista-sistemas").appendChild(o);
      });
    }

    $("aba-entrar").addEventListener("click", function () { aba(false); });
    $("aba-criar").addEventListener("click", function () { aba(true); });
    $("btn-email").addEventListener("click", porUsuario);
    $("btn-google").addEventListener("click", porGoogle);
    $("n-senha").addEventListener("keydown", function (e) { if (e.key === "Enter" && !S.criando) porUsuario(); });
    $("n-senha2").addEventListener("keydown", function (e) { if (e.key === "Enter") porUsuario(); });
    $("n-sair").addEventListener("click", sair);
    $("n-nova").addEventListener("click", novaCampanha);
    $("n-importar").addEventListener("click", importarArquivo);
    $("n-salvar").addEventListener("click", salvar);
    window.addEventListener("beforeunload", function (e) {
      if (S.sujo) { e.preventDefault(); e.returnValue = ""; }
    });

    aba(false);

    D.iniciar(true).then(function (fb) {
      S.fb = fb.firebase;
      S.auth = fb.auth;
      S.db = fb.db;
      S.auth.onAuthStateChanged(avaliarUsuario);
    }, function (e) {
      telas("n-entrada");
      aviso("Não consegui carregar o Firebase: " + (e && e.message ? e.message : "erro desconhecido") +
            " Recarregue a página para tentar de novo.");
    });
  }

  iniciar();
})();
