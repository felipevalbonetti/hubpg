(function () {
  "use strict";

  var API = "https://api.github.com";
  var ARQUIVO = "campanhas.js";
  var CABECALHO =
    "// Arquivo gerado pelo painel admin do HubPG (admin.html).\n" +
    "// Pode ser editado a mão, desde que o conteúdo continue em formato JSON valido.\n" +
    "// Temas disponiveis: ordem, fantasia, cyberpunk, terror, espaco, sangue.\n" +
    "// Sistemas (sistemaId): ordem, conduta, dnd5e, livre.\n";

  var TEMAS = [
    ["ordem", "Ordem Paranormal (preto e branco)"],
    ["fantasia", "Fantasia medieval"],
    ["cyberpunk", "Cyberpunk"],
    ["terror", "Terror"],
    ["espaco", "Ficção científica / espaço"],
    ["sangue", "Escuro e vermelho (ficha digital)"]
  ];

  var estado = { lista: [], sha: null, sujo: false, cfg: null, token: "" };

  function $(id) { return document.getElementById(id); }

  // ---------- funções puras (também expostas para teste) ----------

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

  function extrair(texto) {
    var i = texto.indexOf("const CAMPANHAS");
    if (i === -1) throw new Error("Não achei a lista de campanhas no arquivo.");
    var ini = texto.indexOf("[", i);
    var fim = texto.lastIndexOf("]");
    if (ini === -1 || fim < ini) throw new Error("Formato do arquivo inválido.");
    return JSON.parse(texto.slice(ini, fim + 1));
  }

  function gerar(lista) {
    return CABECALHO + "const CAMPANHAS = " + JSON.stringify(lista, null, 2) + ";\n";
  }

  function paraBase64(str) {
    var bytes = new TextEncoder().encode(str), s = "";
    bytes.forEach(function (b) { s += String.fromCharCode(b); });
    return btoa(s);
  }

  function deBase64(b64) {
    var s = atob(b64.replace(/\s/g, ""));
    var bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function detectarRepo() {
    var m = /^(.+)\.github\.io$/.exec(location.hostname);
    var dono = m ? m[1] : "";
    var primeiro = location.pathname.split("/").filter(Boolean)[0] || "";
    var repo = (primeiro && !/\.html?$/.test(primeiro)) ? primeiro : "";
    return { dono: dono, repo: repo };
  }

  window.HubPGAdmin = { slug: slug, idUnico: idUnico, extrair: extrair, gerar: gerar,
                        paraBase64: paraBase64, deBase64: deBase64, TEMAS: TEMAS };

  // ---------- interface ----------

  function aviso(msg, ok) {
    var a = $("aviso");
    if (!msg) { a.hidden = true; return; }
    a.textContent = msg;
    a.className = "aviso" + (ok ? " ok" : "");
    a.hidden = false;
  }

  function marcarSujo(v) {
    estado.sujo = v;
    $("salvar").disabled = !v;
  }

  function desenharLista() {
    var ul = $("lista");
    ul.textContent = "";
    if (!estado.lista.length) {
      var vazio = document.createElement("li");
      vazio.textContent = "Nenhuma campanha cadastrada.";
      ul.appendChild(vazio);
      return;
    }
    estado.lista.forEach(function (c, idx) {
      var li = document.createElement("li");
      var info = document.createElement("div");
      var nome = document.createElement("div");
      nome.className = "nome";
      nome.textContent = c.titulo;
      var det = document.createElement("div");
      det.className = "detalhe";
      det.textContent = [c.sistema, c.status, "tema: " + (c.tema || "ordem")].filter(Boolean).join(" · ");
      info.appendChild(nome);
      info.appendChild(det);

      var bt = document.createElement("button");
      bt.type = "button";
      bt.className = "btn btn-claro";
      bt.textContent = "Remover";
      bt.addEventListener("click", function () {
        if (!confirm("Remover a campanha \"" + c.titulo + "\"? Isso só vale depois de salvar.")) return;
        estado.lista.splice(idx, 1);
        marcarSujo(true);
        desenharLista();
      });

      li.appendChild(info);
      li.appendChild(bt);
      ul.appendChild(li);
    });
  }

  // ---------- GitHub ----------

  function chamar(metodo, caminho, corpo) {
    return fetch(API + caminho, {
      method: metodo,
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + estado.token,
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: corpo ? JSON.stringify(corpo) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (dados) {
        if (!r.ok) {
          var msg = "Erro " + r.status + " do GitHub.";
          if (r.status === 401) msg = "Token inválido ou expirado.";
          else if (r.status === 403) msg = "O token não tem permissão de escrita neste repositório (ou o limite de uso foi atingido).";
          else if (r.status === 404) msg = "Repositório ou arquivo não encontrado. Confira usuário, nome do repositório, branch e se o token tem acesso a ele.";
          else if (r.status === 409 || r.status === 422) msg = "O arquivo mudou no GitHub desde que você entrou. Saia, entre de novo e refaça a alteração.";
          var e = new Error(msg);
          e.status = r.status;
          throw e;
        }
        return dados;
      });
    });
  }

  function caminhoArquivo() {
    var c = estado.cfg;
    return "/repos/" + encodeURIComponent(c.dono) + "/" + encodeURIComponent(c.repo) +
           "/contents/" + ARQUIVO;
  }

  function carregar() {
    return chamar("GET", caminhoArquivo() + "?ref=" + encodeURIComponent(estado.cfg.ramo))
      .then(function (r) {
        estado.sha = r.sha;
        estado.lista = extrair(deBase64(r.content));
      });
  }

  function lerCfg() {
    return {
      dono: $("dono").value.trim(),
      repo: $("repo").value.trim(),
      ramo: $("ramo").value.trim() || "main"
    };
  }

  // Testa o token no GitHub, carrega as campanhas e abre o painel. Rejeita se algo falhar.
  function abrirPainel(cfg, token) {
    estado.cfg = cfg;
    estado.token = token;
    return carregar().then(function () {
      try {
        sessionStorage.setItem("hubpg-token", token);
        localStorage.setItem("hubpg-cfg", JSON.stringify(cfg));
      } catch (e) { /* armazenamento indisponível: segue sem lembrar */ }
      $("entrada").hidden = true;
      $("gerenciar").hidden = false;
      marcarSujo(false);
      desenharLista();
    }, function (e) {
      estado.token = "";
      throw e;
    });
  }

  // Entrada direta, só com o token (sem criar conta)
  function entrar() {
    aviso("");
    var cfg = lerCfg();
    var token = $("token").value.trim();
    if (!cfg.dono || !cfg.repo || !token) {
      aviso("Preencha usuário, repositório e token.");
      return;
    }
    $("entrar").disabled = true;
    abrirPainel(cfg, token).catch(function (e) {
      aviso(e.message || "Não foi possível entrar.");
    }).then(function () { $("entrar").disabled = false; });
  }

  // ---------- conta com senha: o token fica criptografado neste navegador ----------
  // A senha gera uma chave (PBKDF2, 250 mil voltas) que tranca o token com AES-GCM.
  // Sem a senha, o que está guardado no navegador é só texto embaralhado.

  var CHAVE_CONTA = "hubpg-conta";
  var falhasSenha = 0;

  function temCripto() {
    return typeof crypto !== "undefined" && !!crypto.subtle && typeof crypto.subtle.importKey === "function";
  }

  function aBytes(t) { return new TextEncoder().encode(t); }

  function bytesParaB64(buf) {
    var b = new Uint8Array(buf), s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }

  function b64ParaBytes(b64) {
    var s = atob(b64), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }

  function derivarChave(senha, sal) {
    return crypto.subtle.importKey("raw", aBytes(senha), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: sal, iterations: 250000, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }

  function cifrar(senha, texto) {
    var sal = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return derivarChave(senha, sal).then(function (chave) {
      return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, chave, aBytes(texto));
    }).then(function (buf) {
      return { v: 1, sal: bytesParaB64(sal), iv: bytesParaB64(iv), dados: bytesParaB64(buf) };
    });
  }

  // Rejeita se a senha estiver errada (o AES-GCM não destranca com chave diferente)
  function decifrar(senha, seg) {
    return derivarChave(senha, b64ParaBytes(seg.sal)).then(function (chave) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ParaBytes(seg.iv) }, chave, b64ParaBytes(seg.dados));
    }).then(function (buf) { return new TextDecoder().decode(buf); });
  }

  window.HubPGAdmin.cifrar = cifrar;
  window.HubPGAdmin.decifrar = decifrar;

  function lerConta() {
    try {
      var c = JSON.parse(localStorage.getItem(CHAVE_CONTA) || "null");
      return (c && c.seg && c.cfg) ? c : null;
    } catch (e) { return null; }
  }

  function mostrarEntrada() {
    var conta = lerConta();
    $("gerenciar").hidden = true;
    $("entrada").hidden = false;
    $("p-entrar").hidden = !conta;
    $("p-criar").hidden = !!conta;
    if (conta) {
      $("resumo-conta").textContent = conta.cfg.dono + "/" + conta.cfg.repo;
      $("senha-entrar").value = "";
    }
  }

  function criarConta() {
    aviso("");
    var cfg = lerCfg();
    var token = $("token").value.trim();
    var s1 = $("senha-nova").value, s2 = $("senha-nova2").value;
    if (!cfg.dono || !cfg.repo || !token) { aviso("Preencha usuário, repositório e token."); return; }
    if (!temCripto()) {
      aviso("Este navegador não deixa guardar a senha com segurança nesta página (ela precisa abrir por https). Use \"Entrar só com o token\".");
      return;
    }
    if (s1.length < 4) { aviso("A senha precisa ter pelo menos 4 caracteres."); return; }
    if (s1 !== s2) { aviso("As duas senhas não são iguais."); return; }
    $("criar-conta").disabled = true;
    abrirPainel(cfg, token).then(function () {
      return cifrar(s1, token).then(function (seg) {
        try {
          localStorage.setItem(CHAVE_CONTA, JSON.stringify({ cfg: cfg, seg: seg }));
        } catch (e) {
          aviso("Você entrou, mas não consegui guardar a conta neste navegador.");
          return;
        }
        aviso("Conta criada. Da próxima vez, entre só com a senha." +
              (s1.length < 8 ? " Senha curta: ela só protege o token guardado neste navegador." : ""), true);
      });
    }).catch(function (e) {
      aviso(e.message || "Não foi possível criar a conta.");
    }).then(function () {
      $("criar-conta").disabled = false;
      $("senha-nova").value = "";
      $("senha-nova2").value = "";
      $("token").value = "";
    });
  }

  function entrarComSenha() {
    aviso("");
    var conta = lerConta();
    if (!conta) { mostrarEntrada(); return; }
    var senha = $("senha-entrar").value;
    if (!senha) { aviso("Digite a senha."); return; }
    var btn = $("entrar-senha");
    btn.disabled = true;
    decifrar(senha, conta.seg).then(function (token) {
      falhasSenha = 0;
      return abrirPainel(conta.cfg, token).catch(function (e) {
        aviso((e.message || "Não foi possível entrar.") +
              " Se o token expirou ou foi revogado, use \"Esqueci a senha / trocar de token\" e crie a conta de novo.");
      });
    }, function () {
      falhasSenha++;
      aviso("Senha incorreta.");
      // atrasa as tentativas seguidas
      return new Promise(function (ok) { setTimeout(ok, Math.min(falhasSenha, 5) * 1000); });
    }).then(function () {
      btn.disabled = false;
      $("senha-entrar").value = "";
    });
  }

  function apagarConta() {
    if (!confirm("Apagar a conta deste navegador? Para criar de novo você vai precisar do token do GitHub.")) return;
    try {
      localStorage.removeItem(CHAVE_CONTA);
      sessionStorage.removeItem("hubpg-token");
    } catch (e) {}
    mostrarEntrada();
    aviso("Conta apagada deste navegador.", true);
  }

  function salvar() {
    aviso("");
    $("salvar").disabled = true;
    chamar("PUT", caminhoArquivo(), {
      message: "Atualiza campanhas pelo painel admin",
      content: paraBase64(gerar(estado.lista)),
      sha: estado.sha,
      branch: estado.cfg.ramo
    }).then(function (r) {
      estado.sha = r.content.sha;
      marcarSujo(false);
      aviso("Salvo. O site atualiza em cerca de um minuto.", true);
    }).catch(function (e) {
      marcarSujo(true);
      aviso(e.message || "Não foi possível salvar.");
    });
  }

  function sair() {
    if (estado.sujo && !confirm("Há mudanças não salvas. Sair mesmo assim?")) return;
    try { sessionStorage.removeItem("hubpg-token"); } catch (e) {}
    estado.token = "";
    estado.lista = [];
    marcarSujo(false);
    $("token").value = "";
    mostrarEntrada();
    aviso("");
  }

  function adicionar(ev) {
    ev.preventDefault();
    var titulo = $("f-titulo").value.trim();
    if (!titulo) return;
    estado.lista.push({
      id: idUnico(titulo, estado.lista),
      titulo: titulo,
      sistema: $("f-sistema").value.trim(),
      sistemaId: (typeof HubPGSistemas !== "undefined") ? HubPGSistemas.acharSistema($("f-sistema").value.trim()).id : undefined,
      mestre: $("f-mestre").value.trim(),
      status: $("f-status").value,
      tema: $("f-tema").value,
      resumo: $("f-resumo").value.trim(),
      personagens: [],
      sessoes: []
    });
    $("form").reset();
    marcarSujo(true);
    desenharLista();
    aviso("Campanha adicionada à lista. Clique em Salvar no GitHub para publicar.", true);
  }

  function iniciar() {
    TEMAS.forEach(function (t) {
      var o = document.createElement("option");
      o.value = t[0];
      o.textContent = t[1];
      $("f-tema").appendChild(o);
    });

    if (typeof HubPGSistemas !== "undefined") {
      HubPGSistemas.nomes().forEach(function (n) {
        var o = document.createElement("option");
        o.value = n;
        $("lista-sistemas").appendChild(o);
      });
    }

    var det = detectarRepo();
    var salvo = {};
    try { salvo = JSON.parse(localStorage.getItem("hubpg-cfg") || "{}"); } catch (e) {}
    var conta = lerConta();
    if (conta) salvo = conta.cfg;
    $("dono").value = det.dono || salvo.dono || "";
    $("repo").value = det.repo || salvo.repo || "hubpg";
    $("ramo").value = salvo.ramo || "main";

    $("entrar").addEventListener("click", entrar);
    $("token").addEventListener("keydown", function (e) { if (e.key === "Enter") entrar(); });
    $("criar-conta").addEventListener("click", criarConta);
    $("senha-nova2").addEventListener("keydown", function (e) { if (e.key === "Enter") criarConta(); });
    $("entrar-senha").addEventListener("click", entrarComSenha);
    $("senha-entrar").addEventListener("keydown", function (e) { if (e.key === "Enter") entrarComSenha(); });
    $("apagar-conta").addEventListener("click", apagarConta);
    mostrarEntrada();
    $("form").addEventListener("submit", adicionar);
    $("salvar").addEventListener("click", salvar);
    $("sair").addEventListener("click", sair);

    window.addEventListener("beforeunload", function (e) {
      if (estado.sujo) { e.preventDefault(); e.returnValue = ""; }
    });

    var tokenSalvo = "";
    try { tokenSalvo = sessionStorage.getItem("hubpg-token") || ""; } catch (e) {}
    if (tokenSalvo && $("dono").value && $("repo").value) {
      $("token").value = tokenSalvo;
      entrar();
    }
  }

  if (typeof document !== "undefined" && document.getElementById("entrar")) {
    // Com o Firebase configurado, quem assume o painel é o admin-nuvem.js
    var nuvem = !!(window.HubPGDados && window.HubPGDados.configurado());
    if (!nuvem) {
      $("carregando").hidden = true;
      $("modo-arquivo").hidden = false;   // primeiro mostra, depois liga os botões: nunca fica em branco
      iniciar();
    }
  }
})();
