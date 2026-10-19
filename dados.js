// =====================================================================
//  DE ONDE VÊM AS CAMPANHAS
//  - Firebase configurado (firebase-config.js): lê do Firestore.
//  - Senão, ou se o Firebase não responder: lê do arquivo campanhas.js.
//  O SDK do Firebase só é baixado quando está configurado.
// =====================================================================
(function () {
  "use strict";

  var VERSAO_SDK = "10.14.1";
  var BASE_SDK = "https://www.gstatic.com/firebasejs/" + VERSAO_SDK + "/";
  var LIMITE_MS = 10000;

  var scripts = {};   // arquivos já pedidos
  var iniciados = {}; // "base" | "auth" -> promessa

  function configurado() {
    var c = window.FIREBASE_CONFIG;
    return !!(c && typeof c === "object" && c.apiKey && c.projectId);
  }

  function carregarScript(arquivo) {
    if (scripts[arquivo]) return scripts[arquivo];
    var p = new Promise(function (ok, falha) {
      var s = document.createElement("script");
      s.src = BASE_SDK + arquivo;
      s.async = false;
      s.onload = function () { ok(); };
      s.onerror = function () { falha(new Error("Não consegui baixar " + arquivo + ".")); };
      document.head.appendChild(s);
    });
    p.catch(function () { delete scripts[arquivo]; });
    scripts[arquivo] = p;
    return p;
  }

  function comLimite(promessa, ms, msg) {
    return new Promise(function (ok, falha) {
      var t = setTimeout(function () { falha(new Error(msg)); }, ms);
      promessa.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); falha(e); });
    });
  }

  // Devolve { firebase, db, auth }. O "auth" só vem se pedido (o painel admin pede).
  function iniciar(comAuth) {
    var chave = comAuth ? "auth" : "base";
    if (iniciados[chave]) return iniciados[chave];
    if (!configurado()) return Promise.reject(new Error("Firebase não configurado."));
    var p = comLimite(
      carregarScript("firebase-app-compat.js")
        .then(function () { return carregarScript("firebase-firestore-compat.js"); })
        .then(function () { return comAuth ? carregarScript("firebase-auth-compat.js") : null; })
        .then(function () {
          if (!window.firebase.apps.length) window.firebase.initializeApp(window.FIREBASE_CONFIG);
          return {
            firebase: window.firebase,
            db: window.firebase.firestore(),
            auth: comAuth ? window.firebase.auth() : null
          };
        }),
      LIMITE_MS, "O Firebase demorou demais para responder.");
    p.catch(function () { delete iniciados[chave]; });   // deixa tentar de novo
    iniciados[chave] = p;
    return p;
  }

  function lerCampanhas(db) {
    return db.collection("campanhas").get().then(function (snap) {
      var lista = [];
      snap.docs.forEach(function (d) {
        var c = d.data();
        if (c && typeof c === "object") {
          if (!c.id) c.id = d.id;
          lista.push(c);
        }
      });
      lista.sort(function (a, b) {
        return ((a.ordem || 0) - (b.ordem || 0)) || String(a.titulo).localeCompare(String(b.titulo));
      });
      return lista;
    });
  }

  function doArquivo() {
    return (typeof CAMPANHAS !== "undefined" && CAMPANHAS) || [];
  }

  // Para as páginas públicas. Sempre resolve: { lista, origem: "nuvem" | "arquivo", erro? }
  function carregar() {
    if (!configurado()) return Promise.resolve({ lista: doArquivo(), origem: "arquivo" });
    return iniciar(false)
      .then(function (fb) { return lerCampanhas(fb.db); })
      .then(function (lista) { return { lista: lista, origem: "nuvem" }; })
      .catch(function (e) { return { lista: doArquivo(), origem: "arquivo", erro: e }; });
  }

  window.HubPGDados = {
    configurado: configurado,
    iniciar: iniciar,
    lerCampanhas: lerCampanhas,
    carregar: carregar,
    doArquivo: doArquivo
  };
})();
