(function () {
  "use strict";
  var doc = document.documentElement;

  // Theme
  var themeButton = document.querySelector(".theme-toggle");
  if (themeButton) themeButton.addEventListener("click", function () {
    var next = doc.dataset.theme === "light" ? "dark" : "light";
    doc.dataset.theme = next;
    try { localStorage.setItem("bl-theme", next); } catch (e) {}
  });

  // Mobile navigation
  var menu = document.querySelector(".menu-toggle");
  if (menu) menu.addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
  document.addEventListener("click", function (e) {
    if (document.body.classList.contains("nav-open") && !e.target.closest(".sidebar, .menu-toggle")) document.body.classList.remove("nav-open");
  });
  var active = document.querySelector(".sidebar a.active");
  if (active) active.scrollIntoView({ block: "center" });

  // Tables scroll on narrow screens
  document.querySelectorAll(".content table").forEach(function (table) {
    if (table.parentElement.classList.contains("table-wrap")) return;
    var wrap = document.createElement("div");
    wrap.className = "table-wrap";
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  // On this page
  var tocNav = document.querySelector(".toc nav");
  var headings = Array.prototype.slice.call(document.querySelectorAll(".content h2[id], .content h3[id]"));
  if (tocNav) {
    if (headings.length < 2) { document.querySelector(".toc").style.visibility = "hidden"; }
    headings.forEach(function (h) {
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.childNodes[0].textContent;
      a.className = h.tagName.toLowerCase();
      tocNav.appendChild(a);
    });
    var links = tocNav.querySelectorAll("a");
    var spy = function () {
      var current = 0;
      headings.forEach(function (h, i) { if (h.getBoundingClientRect().top < 120) current = i; });
      links.forEach(function (a, i) { a.classList.toggle("on", i === current); });
    };
    window.addEventListener("scroll", spy, { passive: true });
    spy();
  }

  // Code: language label, copy button and light highlighting
  var KEYWORDS = /^(void|bool|int32|int64|uint8|float|double|const|static|virtual|override|return|if|else|for|while|class|struct|enum|public|private|protected|true|false|nullptr|auto|new|delete|template|typename|namespace|using|this|switch|case|break|continue|default|inline|operator|sizeof)$/;
  var MACROS = /^(UCLASS|USTRUCT|UENUM|UPROPERTY|UFUNCTION|UINTERFACE|GENERATED_BODY|TEXT|LOCTEXT|NSLOCTEXT|UE_LOG|UMETA|IMPLEMENT_MODULE|DECLARE_[A-Z_]+|check|ensure)$/;
  var TYPES = /^([UAFTEIS][A-Z][A-Za-z0-9]+|ENVS[A-Za-z]+)$/;
  var WORDS = /\b(?:[A-Za-z_]\w*|\d+(?:\.\d+)?f?)\b/g;
  function escapeHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function highlight(src, lang) {
    if (lang === "text" || lang === "console") return escapeHtml(src);
    var out = "", i = 0, re = lang === "ini"
      ? /(;[^\n]*)|(\[[^\]\n]+\])|(=)/g
      : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
    var m;
    while ((m = re.exec(src))) {
      out += plain(src.slice(i, m.index), lang);
      if (lang === "ini") {
        if (m[1]) out += '<span class="tk-c">' + escapeHtml(m[1]) + "</span>";
        else if (m[2]) out += '<span class="tk-t">' + escapeHtml(m[2]) + "</span>";
        else out += '<span class="tk-k">=</span>';
      } else if (m[1]) out += '<span class="tk-c">' + escapeHtml(m[1]) + "</span>";
      else out += '<span class="tk-s">' + escapeHtml(m[2]) + "</span>";
      i = re.lastIndex;
    }
    return out + plain(src.slice(i), lang);
  }
  // One pass over the words, so a span added for one word is never re-matched by the next rule.
  function plain(s, lang) {
    s = escapeHtml(s);
    if (lang === "ini") return s;
    return s.replace(WORDS, function (w, offset, whole) {
      if (whole.charAt(offset - 1) === "&") return w;
      var cls = MACROS.test(w) ? "tk-m" : KEYWORDS.test(w) ? "tk-k" : TYPES.test(w) ? "tk-t" : /^\d/.test(w) ? "tk-n" : "";
      return cls ? '<span class="' + cls + '">' + w + "</span>" : w;
    });
  }
  document.querySelectorAll("pre > code").forEach(function (code) {
    var pre = code.parentElement;
    var lang = (code.className.match(/lang-(\w+)/) || [, "cpp"])[1];
    var source = code.textContent.replace(/^\n+|\s+$/g, "");
    code.innerHTML = highlight(source, lang);
    var label = document.createElement("span");
    label.className = "lang";
    label.textContent = lang === "cpp" ? "C++" : lang;
    pre.appendChild(label);
    var copy = document.createElement("button");
    copy.className = "copy";
    copy.textContent = "Copy";
    copy.addEventListener("click", function () {
      var done = function () { copy.textContent = "Copied"; copy.classList.add("done"); setTimeout(function () { copy.textContent = "Copy"; copy.classList.remove("done"); }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(source).then(done, function () {});
    });
    pre.appendChild(copy);
  });

  // Tabs: <div class="tabs"><div class="tab" data-label="C++">...</div>...</div>
  document.querySelectorAll(".tabs").forEach(function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll(":scope > .tab"));
    var bar = document.createElement("div");
    bar.className = "tab-bar";
    tabs.forEach(function (tab, i) {
      var b = document.createElement("button");
      b.textContent = tab.dataset.label || "Tab " + (i + 1);
      b.addEventListener("click", function () {
        tabs.forEach(function (t, j) { t.hidden = j !== i; });
        bar.querySelectorAll("button").forEach(function (x, j) { x.classList.toggle("on", j === i); });
      });
      bar.appendChild(b);
      tab.hidden = i !== 0;
      if (i === 0) b.classList.add("on");
    });
    box.insertBefore(bar, box.firstChild);
  });

  // Flow diagrams: <ol class="flow"><li data-title="Short label">Detail HTML</li></ol>
  document.querySelectorAll("ol.flow").forEach(function (list) {
    var steps = Array.prototype.slice.call(list.children);
    var box = document.createElement("div");
    box.className = "flow-diagram";
    var track = document.createElement("div");
    track.className = "flow-track";
    var detail = document.createElement("div");
    detail.className = "flow-detail";
    var controls = document.createElement("div");
    controls.className = "flow-controls";
    var current = 0, timer = null;
    var nodes = steps.map(function (li, i) {
      var b = document.createElement("button");
      b.className = "flow-node";
      b.innerHTML = '<span class="flow-dot">' + (i + 1) + "</span>" + escapeHtml(li.dataset.title || "Step " + (i + 1));
      b.addEventListener("click", function () { stop(); show(i); });
      track.appendChild(b);
      return b;
    });
    function show(i) {
      current = i;
      nodes.forEach(function (n, j) { n.classList.toggle("on", j <= i); });
      detail.innerHTML = steps[i].innerHTML;
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; play.textContent = "Play"; } }
    var prev = document.createElement("button"); prev.textContent = "Back";
    var play = document.createElement("button"); play.textContent = "Play";
    var next = document.createElement("button"); next.textContent = "Next";
    prev.addEventListener("click", function () { stop(); show(Math.max(0, current - 1)); });
    next.addEventListener("click", function () { stop(); show(Math.min(steps.length - 1, current + 1)); });
    play.addEventListener("click", function () {
      if (timer) return stop();
      play.textContent = "Pause";
      if (current === steps.length - 1) show(0);
      timer = setInterval(function () { if (current >= steps.length - 1) return stop(); show(current + 1); }, 2600);
    });
    controls.appendChild(prev); controls.appendChild(play); controls.appendChild(next);
    box.appendChild(track); box.appendChild(detail); box.appendChild(controls);
    list.parentNode.replaceChild(box, list);
    show(0);
  });

  // Lightbox
  var lightbox = document.querySelector(".lightbox");
  document.querySelectorAll("figure.shot img, .gallery img, .hero-shot img").forEach(function (img) {
    img.addEventListener("click", function () {
      lightbox.querySelector("img").src = img.src;
      var cap = img.closest("figure") && img.closest("figure").querySelector("figcaption");
      lightbox.querySelector(".lightbox-caption").textContent = cap ? cap.textContent : img.alt;
      lightbox.hidden = false;
    });
  });
  if (lightbox) lightbox.addEventListener("click", function () { lightbox.hidden = true; });

  // Token playground: <div data-widget="token-playground"></div>
  document.querySelectorAll('[data-widget="token-playground"]').forEach(function (host) {
    var roles = [
      ["Surface", "#0b0b0a"], ["Accent", "#e7840e"], ["TextPrimary", "#ede7db"], ["TextDim", "#8b8276"],
      ["Success", "#3a9c5f"], ["Danger", "#e56a6a"], ["OnAccent", "#100e0b"]
    ];
    var presets = {
      Default: ["#0b0b0a", "#e7840e", "#ede7db", "#8b8276", "#3a9c5f", "#e56a6a", "#100e0b"],
      Arctic: ["#0a0e12", "#4fb3d9", "#e3edf2", "#7d8f99", "#47b58a", "#e0677a", "#06141b"],
      Toxic: ["#0b0c08", "#a6d608", "#e8ecd9", "#868c74", "#4cb050", "#e2604f", "#101405"],
      Crimson: ["#0d0909", "#d63c3c", "#efe3e1", "#937c79", "#3e9e6a", "#f08a5d", "#170606"]
    };
    host.className = "playground";
    var controls = document.createElement("div");
    controls.className = "pg-controls";
    var stage = document.createElement("div");
    stage.className = "pg-stage";
    var ini = document.createElement("div");
    ini.className = "pg-ini";
    var inputs = roles.map(function (r) {
      var label = document.createElement("label");
      label.textContent = r[0];
      var input = document.createElement("input");
      input.type = "color";
      input.value = r[1];
      input.addEventListener("input", render);
      label.appendChild(input);
      controls.appendChild(label);
      return input;
    });
    var presetRow = document.createElement("div");
    presetRow.className = "pg-presets";
    Object.keys(presets).forEach(function (name) {
      var b = document.createElement("button");
      b.textContent = name;
      b.addEventListener("click", function () { presets[name].forEach(function (v, i) { inputs[i].value = v; }); render(); });
      presetRow.appendChild(b);
    });
    controls.appendChild(presetRow);
    function hexToRgba(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
    }
    function render() {
      var c = {};
      roles.forEach(function (r, i) { c[r[0]] = inputs[i].value; });
      stage.style.background = c.Surface;
      stage.style.color = c.TextPrimary;
      stage.innerHTML =
        '<div style="font:600 10px/1 JetBrains Mono,monospace;letter-spacing:.14em;color:' + c.Accent + ';margin-bottom:10px">WHAT YOU CARRY</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
        tile(c, "AK-74 rifle", "€18,400", true) + tile(c, "Med kit", "€2,100", false) + tile(c, "Ranger hood", "LOCKED", false, true) +
        "</div>" +
        '<div style="display:flex;gap:8px;align-items:center">' +
        '<span style="display:inline-block;padding:8px 16px;background:' + c.Accent + ";color:" + c.OnAccent + ';font:600 12px JetBrains Mono,monospace">Buy · €650</span>' +
        '<span style="display:inline-block;padding:7px 15px;border:1px solid ' + hexToRgba(c.TextPrimary, .25) + ';font:500 12px JetBrains Mono,monospace">Reset the look</span>' +
        '<span style="margin-left:auto;font:500 11px JetBrains Mono,monospace;color:' + c.Success + '">● ONLINE</span>' +
        '<span style="font:500 11px JetBrains Mono,monospace;color:' + c.Danger + '">● 12% HP</span>' +
        "</div>";
      var lines = ["; Config/DefaultGame.ini is not where colours live. Set them on your style asset:", "; Content Browser > DA_BlacklineStyle > Colors"];
      roles.forEach(function (r) { lines.push(r[0] + " = " + c[r[0]].toUpperCase()); });
      ini.innerHTML = "<pre><code>" + escapeHtml(lines.join("\n")) + "</code></pre>";
      ini.querySelector("code").innerHTML = highlight(lines.join("\n"), "ini");
    }
    function tile(c, name, value, selected, locked) {
      return '<div style="width:150px;padding:8px;border:1px solid ' + (selected ? c.Accent : hexToRgba(c.TextPrimary, .12)) + ";background:" + (selected ? hexToRgba(c.Accent, .1) : hexToRgba(c.TextPrimary, .03)) + '">' +
        '<div style="height:56px;margin-bottom:8px;background:' + hexToRgba(c.TextPrimary, .05) + (locked ? ";background-image:repeating-linear-gradient(45deg," + hexToRgba(c.TextPrimary, .06) + " 0 2px,transparent 2px 7px)" : "") + '"></div>' +
        '<div style="font:500 12px JetBrains Mono,monospace">' + name + "</div>" +
        '<div style="font:500 11px JetBrains Mono,monospace;color:' + (locked ? c.TextDim : c.Accent) + '">' + value + "</div></div>";
    }
    host.appendChild(controls); host.appendChild(stage); host.appendChild(ini);
    render();
  });

  // Search
  var panel = document.querySelector(".search-panel");
  var input = panel && panel.querySelector("input");
  var results = panel && panel.querySelector(".search-results");
  var picked = 0;
  function openSearch() { panel.hidden = false; input.value = ""; runSearch(); input.focus(); }
  function closeSearch() { panel.hidden = true; }
  function runSearch() {
    var q = input.value.trim().toLowerCase();
    var words = q.split(/\s+/).filter(Boolean);
    var index = window.SEARCH_INDEX || [];
    var scored = index.map(function (page) {
      if (!words.length) return { page: page, score: 1, hit: page.s };
      var score = 0, hit = page.s, title = page.t.toLowerCase(), body = page.x.toLowerCase();
      for (var i = 0; i < words.length; i++) {
        var w = words[i], s = 0;
        if (title.indexOf(w) >= 0) s += 10;
        page.h.forEach(function (h) { if (h.toLowerCase().indexOf(w) >= 0) s += 4; });
        var at = body.indexOf(w);
        if (at >= 0) { s += 1; if (hit === page.s) hit = "…" + page.x.slice(Math.max(0, at - 50), at + 90) + "…"; }
        if (!s) return { score: 0 };
        score += s;
      }
      return { page: page, score: score, hit: hit };
    }).filter(function (r) { return r.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 12);
    picked = 0;
    if (!scored.length) { results.innerHTML = '<div class="empty">Nothing matches “' + escapeHtml(q) + '”.</div>'; return; }
    results.innerHTML = scored.map(function (r, i) {
      var text = escapeHtml(r.hit || "");
      words.forEach(function (w) { text = text.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>"); });
      return '<a href="' + r.page.u + (words.length ? "?q=" + encodeURIComponent(q) : "") + '"' + (i === 0 ? ' class="on"' : "") + "><strong>" + escapeHtml(r.page.t) + "</strong>" + text + "</a>";
    }).join("");
  }
  if (panel) {
    document.querySelector(".search-open").addEventListener("click", openSearch);
    panel.addEventListener("click", function (e) { if (e.target === panel) closeSearch(); });
    input.addEventListener("input", runSearch);
    input.addEventListener("keydown", function (e) {
      var items = results.querySelectorAll("a");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        picked = (picked + (e.key === "ArrowDown" ? 1 : items.length - 1)) % Math.max(1, items.length);
        items.forEach(function (a, i) { a.classList.toggle("on", i === picked); });
        if (items[picked]) items[picked].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && items[picked]) { location.href = items[picked].href; }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeSearch(); if (lightbox) lightbox.hidden = true; }
      if (e.key === "/" && panel.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
    });
  }
})();
