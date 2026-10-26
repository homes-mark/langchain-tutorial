/* ============================================================
   LangChain 1.2 学习教程 — 共享脚本
   功能：语法高亮 / 阅读进度条 / 目录高亮 / 完成状态持久化
   完全离线，无外部依赖
   ============================================================ */

(function () {
  'use strict';

  /* ---------- 1. Python 代码语法高亮（轻量 tokenizer） ---------- */
  var KEYWORDS = new Set([
    'def','class','return','import','from','as','if','elif','else','for','while',
    'try','except','finally','with','lambda','yield','pass','break','continue',
    'global','nonlocal','raise','assert','del','in','not','and','or','is','None',
    'True','False','async','await','match','case'
  ]);
  var BUILTINS = new Set([
    'print','len','range','type','str','int','float','list','dict','set','tuple',
    'bool','enumerate','zip','map','filter','isinstance','super','open','input',
    'sum','min','max','sorted','any','all','abs','round'
  ]);

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(code) {
    // 依次处理：字符串 -> 注释 -> 关键字/内置 -> 数字 -> 函数名 -> 类名 -> 装饰器
    var out = '';
    var i = 0;
    var n = code.length;

    while (i < n) {
      var c = code[i];

      // 字符串（单/双/三引号）
      if (c === '"' || c === "'") {
        var triple = code.substr(i, 3) === c + c + c;
        var quote = triple ? c + c + c : c;
        var j = i + quote.length;
        while (j < n) {
          if (code.substr(j, quote.length) === quote) { j += quote.length; break; }
          if (code[j] === '\\') j += 2; else j++;
        }
        out += '<span class="tok-str">' + escapeHtml(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }

      // 注释
      if (c === '#') {
        var k = i;
        while (k < n && code[k] !== '\n') k++;
        out += '<span class="tok-com">' + escapeHtml(code.slice(i, k)) + '</span>';
        i = k;
        continue;
      }

      // 标识符 / 关键字
      if (/[A-Za-z_]/.test(c)) {
        var m = i;
        while (m < n && /[A-Za-z0-9_]/.test(code[m])) m++;
        var word = code.slice(i, m);
        var cls = 'tok-var';
        if (KEYWORDS.has(word)) cls = 'tok-kw';
        else if (BUILTINS.has(word)) cls = 'tok-blt';
        else if (word === 'self' || word === 'cls') cls = 'tok-self';
        // 函数调用 foo(
        if (cls === 'tok-var' && m < n && code[m] === '(') cls = 'tok-fn';
        // 类名：前一个 token 是 class/def 后的单词已覆盖；启发式：首字母大写
        else if (cls === 'tok-var' && /^[A-Z]/.test(word)) cls = 'tok-cls';
        out += '<span class="' + cls + '">' + escapeHtml(word) + '</span>';
        i = m;
        continue;
      }

      // 数字
      if (/[0-9]/.test(c)) {
        var p = i;
        while (p < n && /[0-9a-fA-FxX_.]/.test(code[p])) p++;
        out += '<span class="tok-num">' + escapeHtml(code.slice(i, p)) + '</span>';
        i = p;
        continue;
      }

      // 装饰器
      if (c === '@') {
        var q = i;
        while (q < n && /[A-Za-z0-9_.]/.test(code[q])) q++;
        out += '<span class="tok-dec">' + escapeHtml(code.slice(i, q)) + '</span>';
        i = q;
        continue;
      }

      // 运算符
      if ('+-*/%=<>!&|^~:'.indexOf(c) !== -1) {
        out += '<span class="tok-op">' + escapeHtml(c) + '</span>';
        i++;
        continue;
      }

      out += escapeHtml(c);
      i++;
    }
    return out;
  }

  // 仅对带 data-lang="python" 且未高亮的块处理
  document.querySelectorAll('pre code[data-lang="python"]').forEach(function (el) {
    if (el.dataset.highlighted) return;
    el.innerHTML = highlight(el.textContent);
    el.dataset.highlighted = '1';
  });

  /* ---------- 2. 阅读进度条 ---------- */
  var fill = document.querySelector('.progress-fill');
  var label = document.querySelector('.progress-label');
  var h2s = Array.prototype.slice.call(document.querySelectorAll('.main h2'));

  function updateProgress() {
    if (!fill) return;
    var scrolled = window.scrollY + window.innerHeight * 0.3;
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docH > 0 ? Math.min(100, Math.max(0, (window.scrollY / docH) * 100)) : 0;
    fill.style.width = pct.toFixed(1) + '%';
    if (label) {
      var done = h2s.filter(function (h) { return h.getBoundingClientRect().top < window.innerHeight * 0.5; }).length;
      label.textContent = '阅读进度 ' + Math.round(pct) + '% · 已完成 ' + done + '/' + h2s.length + ' 节';
    }
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* ---------- 3. 侧边栏目录高亮（scrollspy） ---------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.sidebar .toc a[href^="#"]'));
  var sections = tocLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  function updateToc() {
    var pos = window.scrollY + 120;
    var current = null;
    sections.forEach(function (sec) {
      if (sec.offsetTop <= pos) current = sec;
    });
    tocLinks.forEach(function (a) {
      a.classList.toggle('active', current && a.getAttribute('href') === '#' + current.id);
    });
  }
  window.addEventListener('scroll', updateToc, { passive: true });
  updateToc();

  /* ---------- 4. 完成状态持久化（localStorage） ---------- */
  var PAGE_KEY = 'langchain-tutorial-page';
  function getPageId() {
    var meta = document.querySelector('meta[name="page-id"]');
    return meta ? meta.getAttribute('content') : location.pathname;
  }
  var pageId = getPageId();

  document.querySelectorAll('.check-item input[type="checkbox"]').forEach(function (cb) {
    var id = pageId + '::' + (cb.dataset.checkId || cb.value || cb.id);
    // 恢复
    try {
      if (localStorage.getItem('lc-check:' + id) === '1') cb.checked = true;
    } catch (e) {}
    cb.addEventListener('change', function () {
      try {
        if (cb.checked) localStorage.setItem('lc-check:' + id, '1');
        else localStorage.removeItem('lc-check:' + id);
      } catch (e) {}
    });
  });

  /* ---------- 5. 章节完成标记按钮 ---------- */
  document.querySelectorAll('[data-mark-done]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = pageId + '::__page_done__';
      try {
        var done = localStorage.getItem('lc-check:' + id) === '1';
        if (done) { localStorage.removeItem('lc-check:' + id); btn.textContent = btn.dataset.markDone || '标记本节完成'; btn.classList.remove('done'); }
        else { localStorage.setItem('lc-check:' + id, '1'); btn.textContent = '✓ 已完成'; btn.classList.add('done'); }
      } catch (e) {}
    });
    var id = pageId + '::__page_done__';
    try {
      if (localStorage.getItem('lc-check:' + id) === '1') { btn.textContent = '✓ 已完成'; btn.classList.add('done'); }
    } catch (e) {}
  });
})();
