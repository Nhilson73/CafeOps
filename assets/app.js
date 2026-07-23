(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const slugify = (str) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const parseFrontmatter = (text) => {
    const meta = {};
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (m) {
      m[1].split('\n').forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > -1) {
          const key = line.slice(0, idx).trim();
          const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          meta[key] = value;
        }
      });
    }
    return meta;
  };

  const stripFrontmatter = (text) => text.replace(/^---\n[\s\S]*?\n---\n*/, '');

  const elements = {
    manuscript: $('#manuscript'),
    tocTree: $('#toc-tree'),
    tocToggle: $('#toc-toggle'),
    playerInfo: $('#player-info'),
    playerProgress: $('#player-progress'),
    playBtn: $('#tts-play'),
    pauseBtn: $('#tts-pause'),
    stopBtn: $('#tts-stop'),
    backBtn: $('#tts-back'),
    forwardBtn: $('#tts-forward'),
    rateSelect: $('#tts-rate'),
    voiceSelect: $('#tts-voice'),
    themeBtn: $('#theme-toggle'),
    backTop: $('#back-to-top'),
    heroTitle: $('#hero-title'),
    heroSubtitle: $('#hero-subtitle'),
    heroTagline: $('#hero-tagline'),
    heroKicker: $('#hero-kicker'),
    heroDedication: $('#hero-dedication'),
    startBtn: $('#btn-start'),
  };

  // Theme
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    elements.themeBtn.textContent = theme === 'dark' ? '☀' : '☾';
  };

  const toggleTheme = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('cafeops-theme', next); } catch {}
  };

  const savedTheme = (() => {
    try { return localStorage.getItem('cafeops-theme'); } catch { return null; }
  })();
  applyTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  elements.themeBtn.addEventListener('click', toggleTheme);

  // Marked configuration
  marked.setOptions({ gfm: true, breaks: false, html: true });

  const headingMap = new Map();

  const LAYER_COLORS = {
    ferment: '#2D5F3F',
    trace:   '#1F4E79',
    roast:   '#B26B3D',
    gold:    '#9C7C38',
    vision:  '#4A3F6B',
    horizon: '#1F3A5F',
    actor:   '#B8860B',
    action:  '#9C5F0F',
    terroir: '#2D4A3E',
    nebula:  '#1A2747',
    moka:    '#4E342E',
  };

  function layerColorForChapter(n) {
    if (n >= 5 && n <= 7) return LAYER_COLORS.ferment;
    if (n >= 8 && n <= 10) return LAYER_COLORS.trace;
    if (n >= 11 && n <= 13) return LAYER_COLORS.roast;
    if (n >= 14 && n <= 16) return LAYER_COLORS.gold;
    if (n >= 17 && n <= 18) return LAYER_COLORS.vision;
    return LAYER_COLORS.moka;
  }

  function currentChapterColor(el) {
    let color = LAYER_COLORS.moka;
    let prev = el.previousElementSibling;
    while (prev) {
      if (/^H[1-4]$/.test(prev.tagName)) {
        const m = prev.textContent.match(/Capítulo\s+(\d+)/i);
        if (m) {
          color = layerColorForChapter(parseInt(m[1], 10));
          break;
        }
      }
      prev = prev.previousElementSibling;
    }
    return color;
  }

  function applyStyleGuide() {
    // Identify origin-closing blockquotes and color tables by chapter layer
    $$('blockquote, table', elements.manuscript).forEach((el) => {
      const color = currentChapterColor(el);
      el.style.setProperty('--layer-color', color);

      if (el.tagName === 'BLOCKQUOTE') {
        const strong = el.querySelector('strong');
        if (strong && /DESDE EL ORIGEN/i.test(strong.textContent)) {
          el.classList.add('origin-close');
        }
      }

      if (el.tagName === 'TABLE') {
        const firstRow = el.rows[0];
        if (firstRow && firstRow.cells.length === 1) {
          el.classList.add('semantic-box');
        }
      }
    });
  }

  const render = async () => {
    const res = await fetch('manuscript.md?v=3');
    if (!res.ok) throw new Error('No se pudo cargar el manuscrito');
    const raw = await res.text();
    const meta = parseFrontmatter(raw);
    const body = stripFrontmatter(raw);

    if (meta.title && elements.heroTitle) elements.heroTitle.textContent = meta.title;
    if (meta.subtitle && elements.heroSubtitle) elements.heroSubtitle.textContent = meta.subtitle;
    if (meta.subtitle && elements.heroTagline) elements.heroTagline.textContent = meta.subtitle;
    if (meta.author && meta.edition && meta.date) {
      elements.heroKicker.textContent = `${meta.author} · ${meta.edition} · ${meta.date} · ${meta.license || 'CC BY-SA 4.0'}`;
    }

    elements.manuscript.innerHTML = marked.parse(body);
    applyStyleGuide();

    // Enrich headings with stable IDs and anchors
    const headings = $$('h1, h2, h3, h4', elements.manuscript);
    headings.forEach((h) => {
      const id = slugify(h.textContent);
      let unique = id;
      let n = 2;
      while (headingMap.has(unique)) unique = `${id}-${n++}`;
      headingMap.set(unique, h);
      h.id = unique;
      const a = document.createElement('a');
      a.className = 'anchor';
      a.href = `#${unique}`;
      a.setAttribute('aria-hidden', 'true');
      a.textContent = '#';
      h.appendChild(a);
    });

    buildToc(headings);
    prepareTts();
    setupScrollspy(headings);
    populateVoices();

    // Dedication from first blockquote if present
    const firstBq = $('blockquote', elements.manuscript);
    if (firstBq && elements.heroDedication) {
      elements.heroDedication.textContent = firstBq.textContent.trim();
      firstBq.style.display = 'none';
    }
  };

  const buildToc = (headings) => {
    const root = document.createElement('ul');
    const stack = [{ level: 0, el: root }];

    headings.forEach((h) => {
      const level = parseInt(h.tagName[1], 10);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = h.textContent.replace('#', '').trim();
      a.className = `toc-h${level}`;
      a.dataset.target = h.id;
      li.appendChild(a);

      while (stack.length && level <= stack[stack.length - 1].level) {
        stack.pop();
      }
      const parent = stack[stack.length - 1].el;
      let ul = parent.querySelector(':scope > ul');
      if (!ul) {
        ul = document.createElement('ul');
        parent.appendChild(ul);
      }
      ul.appendChild(li);
      stack.push({ level, el: li });
    });

    elements.tocTree.innerHTML = '';
    elements.tocTree.appendChild(root);

    elements.tocTree.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      const target = $(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.innerWidth <= 920) elements.tocTree.classList.remove('open');
    });
  };

  elements.tocToggle.addEventListener('click', () => {
    const open = elements.tocTree.classList.toggle('open');
    elements.tocToggle.setAttribute('aria-expanded', String(open));
  });

  // TTS
  let utterances = [];
  let currentIndex = 0;
  let isPlaying = false;
  let wasPaused = false;

  const splitText = (text) => {
    return text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?;:\u2014\u2026])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const getSelectedVoice = () => {
    const voices = speechSynthesis.getVoices();
    const selected = elements.voiceSelect.value;
    return voices.find((v) => v.voiceURI === selected) || null;
  };

  const currentChapterName = () => {
    const active = $('.manuscript [data-tts-active]');
    if (!active) return 'CafeOps';
    let el = active;
    while (el && el !== elements.manuscript) {
      if (/^H[1-4]$/i.test(el.tagName)) return el.textContent.replace('#', '').trim();
      el = el.parentElement;
    }
    return 'CafeOps';
  };

  const updatePlayer = () => {
    if (!utterances.length) return;
    const pct = (currentIndex / utterances.length) * 100;
    elements.playerProgress.style.width = `${pct}%`;
    const info = `${currentChapterName()} · ${currentIndex + 1}/${utterances.length}`;
    elements.playerInfo.textContent = info;
    elements.playerInfo.setAttribute('title', info);
  };

  const clearHighlight = () => $$('.manuscript [data-tts-active]').forEach((el) => el.removeAttribute('data-tts-active'));

  const speakNext = () => {
    if (!isPlaying || currentIndex >= utterances.length) {
      stopTts();
      return;
    }
    const item = utterances[currentIndex];
    clearHighlight();
    item.element.setAttribute('data-tts-active', 'true');
    item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const u = new SpeechSynthesisUtterance(item.text);
    const voice = getSelectedVoice();
    if (voice) u.voice = voice;
    u.rate = parseFloat(elements.rateSelect.value);
    u.lang = voice ? voice.lang : 'es-419';

    u.onend = () => {
      currentIndex++;
      updatePlayer();
      speakNext();
    };

    u.onerror = (e) => {
      if (e.error !== 'canceled') {
        console.warn('TTS error', e.error);
        currentIndex++;
        updatePlayer();
        speakNext();
      }
    };

    speechSynthesis.speak(u);
  };

  const playTts = (fromStart = false) => {
    if (!utterances.length) return;
    if (fromStart) currentIndex = 0;
    if (wasPaused && currentIndex < utterances.length) {
      speechSynthesis.resume();
    } else {
      speechSynthesis.cancel();
      speakNext();
    }
    isPlaying = true;
    wasPaused = false;
    elements.playBtn.hidden = true;
    elements.pauseBtn.hidden = false;
    updatePlayer();
  };

  const pauseTts = () => {
    if (!isPlaying) return;
    speechSynthesis.pause();
    isPlaying = false;
    wasPaused = true;
    elements.playBtn.hidden = false;
    elements.pauseBtn.hidden = true;
    elements.playerInfo.textContent = 'Pausado · ' + elements.playerInfo.textContent.replace(/^Listo|Reproduciendo|Pausado /, '');
  };

  const stopTts = () => {
    speechSynthesis.cancel();
    isPlaying = false;
    wasPaused = false;
    currentIndex = 0;
    clearHighlight();
    elements.playBtn.hidden = false;
    elements.pauseBtn.hidden = true;
    elements.playerProgress.style.width = '0%';
    elements.playerInfo.textContent = 'Listo para leer en voz alta';
  };

  const prepareTts = () => {
    const readable = $$('p:not(td p), li, blockquote, td, th, h1, h2, h3, h4', elements.manuscript);
    readable.forEach((el) => {
      if (el.closest('pre, code')) return;
      el.dataset.tts = 'true';
    });

    utterances = [];
    $$('[data-tts]', elements.manuscript).forEach((el) => {
      const text = el.textContent.replace('#', '').trim();
      splitText(text).forEach((sentence) => utterances.push({ element: el, text: sentence }));
    });

    // Merge very short fragments to improve flow
    const merged = [];
    let buffer = null;
    utterances.forEach((u) => {
      if (!buffer) {
        buffer = u;
      } else if (buffer.element === u.element && (buffer.text.length + u.text.length < 180)) {
        buffer.text += ' ' + u.text;
      } else {
        merged.push(buffer);
        buffer = u;
      }
    });
    if (buffer) merged.push(buffer);
    utterances = merged;
  };

  elements.playBtn.addEventListener('click', () => playTts(false));
  elements.pauseBtn.addEventListener('click', pauseTts);
  elements.stopBtn.addEventListener('click', stopTts);
  elements.startBtn.addEventListener('click', () => {
    const first = $('[data-tts]', elements.manuscript);
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => playTts(true), 400);
  });

  elements.backBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      speechSynthesis.cancel();
      currentIndex = Math.max(0, currentIndex - 1);
      if (isPlaying) speakNext();
      else updatePlayer();
    }
  });

  elements.forwardBtn.addEventListener('click', () => {
    if (currentIndex < utterances.length - 1) {
      speechSynthesis.cancel();
      currentIndex++;
      if (isPlaying) speakNext();
      else updatePlayer();
    }
  });

  elements.rateSelect.addEventListener('change', () => {
    if (isPlaying) {
      speechSynthesis.cancel();
      speakNext();
    }
  });

  elements.voiceSelect.addEventListener('change', () => {
    if (isPlaying) {
      speechSynthesis.cancel();
      speakNext();
    }
  });

  const populateVoices = () => {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return;
    const esVoices = voices.filter((v) => v.lang.startsWith('es')).sort((a, b) => a.name.localeCompare(b.name));
    const otherVoices = voices.filter((v) => !v.lang.startsWith('es')).sort((a, b) => a.name.localeCompare(b.name));
    const opts = [...esVoices, { name: '──────────', lang: '', disabled: true }, ...otherVoices];

    elements.voiceSelect.innerHTML = '';
    opts.forEach((v) => {
      const option = document.createElement('option');
      option.value = v.voiceURI || v.name;
      option.textContent = `${v.name} (${v.lang})`;
      if (v.disabled) option.disabled = true;
      elements.voiceSelect.appendChild(option);
    });

    const preferred = esVoices.find((v) => /google|microsoft|samantha|monica|paulina|helena|laura/i.test(v.name))
      || esVoices[0]
      || voices[0];
    if (preferred) elements.voiceSelect.value = preferred.voiceURI;
  };

  if ('onvoiceschanged' in speechSynthesis) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      isPlaying ? pauseTts() : playTts(false);
    } else if (e.key === 'Escape') {
      stopTts();
    } else if (e.key === 'ArrowRight') {
      elements.forwardBtn.click();
    } else if (e.key === 'ArrowLeft') {
      elements.backBtn.click();
    }
  });

  // Scrollspy and back-to-top
  const setupScrollspy = (headings) => {
    const tocLinks = $$('.toc-tree a');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            tocLinks.forEach((a) => a.classList.remove('active'));
            const link = $(`.toc-tree a[href="#${entry.target.id}"]`);
            if (link) {
              link.classList.add('active');
              link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        });
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
  };

  const onScroll = () => {
    elements.backTop.classList.toggle('visible', scrollY > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  elements.backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  render().catch((err) => {
    elements.manuscript.innerHTML = `<p style="color:var(--c-coffee-light)">Error cargando el manuscrito: ${err.message}</p>`;
    console.error(err);
  });
})();
