/* =========================================================
   FRESHMAN BIRTHDAY PARTY — invite site
   Edit CONFIG below. Nothing else needs to change.
   ========================================================= */
const CONFIG = {
  // Where RSVPs (name + photo) are sent. Paste your Google Apps Script
  // Web App URL here (see google-apps-script.gs and README.md).
  submitUrl: '[SUBMIT URL]',

  // Shown under "Freshman Office" in the details block and in the calendar file.
  address: 'Nest One, Block C, 15th floor, office 117',

  // Link behind "Open in maps". Replace with an exact Google / Yandex / 2GIS pin if you have one.
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=NEST%20ONE%20Tashkent',

  // Show "Only N places left" once this many places or fewer remain.
  // The limit itself lives in google-apps-script.gs (MAX_GUESTS), not here.
  spotsHint: 10,

  // Freshman's Instagram handle, shown in the "post it to your story" step. e.g. '@freshman.academy'
  instagram: '[INSTAGRAM HANDLE]',

  // Used for the countdown and the calendar file (guest's local time).
  start: '2026-10-01T20:00:00',
  calendarHours: 2,        // party runs 20:00–22:00
  calendarTitle: 'Freshman Birthday Party',
};

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const isSet = v => v && !/^\[.*\]$/.test(v.trim());
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- toast ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  function toast(html) {
    toastEl.innerHTML = html;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 5200);
  }

  /* ---------- personal invite: ?guest=Aziza ---------- */
  const params = new URLSearchParams(location.search);
  const raw = params.get('guest') || params.get('to') || '';
  const guest = raw.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
  if (guest) {
    $$('[data-guest]').forEach(el => (el.textContent = guest + '.'));
    $$('[data-guest-name]').forEach(el => (el.textContent = guest));
    const forEl = $('[data-guest-for]');
    if (forEl) { forEl.textContent = `This pass is for ${guest}.`; forEl.hidden = false; }
  }

  /* ---------- fit text: every line in a group fills the same width ---------- */
  function fitGroup(group) {
    const width = group.clientWidth;
    if (!width) return;
    const lines = $$('.fit', group);
    const scales = lines.map(line => {
      line.style.fontSize = '100px';
      const w = $('.fit__in', line).getBoundingClientRect().width;
      return w ? 100 * width / w : 100;
    });
    // "uniform": one size for all lines (set by the longest), ragged right
    const uniform = group.dataset.fitGroup === 'uniform' ? Math.min(...scales) : 0;
    lines.forEach((line, i) => (line.style.fontSize = (uniform || scales[i]).toFixed(2) + 'px'));
  }
  const groups = $$('[data-fit-group]');
  const fitAll = () => groups.forEach(fitGroup);
  if ('ResizeObserver' in window) {
    let lastW = new WeakMap();
    const ro = new ResizeObserver(entries => entries.forEach(e => {
      const w = Math.round(e.contentRect.width);
      if (lastW.get(e.target) !== w) { lastW.set(e.target, w); fitGroup(e.target); }
    }));
    groups.forEach(g => ro.observe(g));
  } else {
    addEventListener('resize', fitAll);
  }

  // Start the load sequence once brand fonts are in and lines are fitted.
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))]).then(() => {
    fitAll();
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));
  });

  /* ---------- Address + maps ---------- */
  const addrEl = $('[data-address]');
  if (addrEl) addrEl.textContent = isSet(CONFIG.address) ? CONFIG.address : '[FRESHMAN OFFICE ADDRESS]';
  const mapsHref = isSet(CONFIG.mapsUrl)
    ? CONFIG.mapsUrl
    : isSet(CONFIG.address)
      ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CONFIG.address)
      : '';
  $$('[data-maps]').forEach(a => {
    if (mapsHref) { a.href = mapsHref; a.target = '_blank'; a.rel = 'noopener'; }
    else a.addEventListener('click', e => {
      e.preventDefault();
      toast('The office address isn\'t set yet. Add <code>address</code> or <code>mapsUrl</code> in script.js.');
    });
  });

  /* ---------- Calendar (.ics, floating local time) ---------- */
  const start = new Date(CONFIG.start);
  const pad = n => String(n).padStart(2, '0');
  const icsDate = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  $$('[data-calendar]').forEach(btn => btn.addEventListener('click', () => {
    const end = new Date(start.getTime() + CONFIG.calendarHours * 3600e3);
    const place = 'Freshman Office' + (isSet(CONFIG.address) ? ', ' + CONFIG.address : '');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Freshman Academy//Birthday Party//EN',
      'BEGIN:VEVENT',
      'UID:freshman-birthday-2026@freshman',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      'DTSTART:' + icsDate(start), 'DTEND:' + icsDate(end),
      'SUMMARY:' + CONFIG.calendarTitle,
      'LOCATION:' + place.replace(/,/g, '\\,'),
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'freshman-birthday-party.ics' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Saved. Open the file to add the evening to your calendar.');
  }));

  /* ---------- Countdown line ---------- */
  const cd = $('[data-countdown]');
  function countdown() {
    if (!cd) return;
    const ms = start - new Date();
    const day = 864e5;
    if (ms > day) {
      const d = Math.floor(ms / day), h = Math.floor((ms % day) / 36e5);
      cd.textContent = `Starts in ${d} day${d === 1 ? '' : 's'}, ${h} h`;
    } else if (ms > 0) {
      const h = Math.floor(ms / 36e5), m = Math.floor((ms % 36e5) / 6e4);
      cd.textContent = h ? `Starts in ${h} h ${m} min` : `Starts in ${m} min`;
    } else if (ms > -CONFIG.calendarHours * 36e5) {
      cd.textContent = 'Happening now';
    } else {
      cd.textContent = 'Thank you for being there';
    }
  }
  countdown(); setInterval(countdown, 30e3);

  /* ---------- Photos: hide empty slots gracefully ---------- */
  $$('[data-photo]').forEach(img => {
    const miss = () => img.classList.add('is-missing');
    if (img.complete && !img.naturalWidth) miss();
    img.addEventListener('error', miss);
  });

  /* ---------- Story lines fill as they cross the screen ---------- */
  const lines = $$('.story__line');
  let ticking = false;
  function paint() {
    ticking = false;
    const vh = innerHeight;
    lines.forEach(l => {
      const r = l.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * .88 - r.top) / (vh * .42)));
      l.style.setProperty('--p', p.toFixed(3));
    });
  }
  if (!reduceMotion && lines.length) {
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    addEventListener('resize', paint);
    paint();
  }

  /* ---------- Pass follows the cursor (fine pointers only) ---------- */
  const tilt = $('[data-tilt]');
  if (tilt && !reduceMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let raf;
    addEventListener('pointermove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / innerWidth - .5;
        const y = e.clientY / innerHeight - .5;
        tilt.style.transform = `perspective(1400px) rotateZ(${(-x * 5).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg) rotateX(${(-y * 6).toFixed(2)}deg)`;
      });
    }, { passive: true });
    document.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
  }

  /* =========================================================
     RSVP FLOW: fireworks → form → personal pass
     ========================================================= */
  const dialog = $('[data-dialog]');
  const fxCanvas = $('[data-fx]');

  /* ---------- fireworks (brand colours, no library) ---------- */
  const fx = (() => {
    const ctx = fxCanvas.getContext('2d');
    const colors = ['#FF9300', '#FFB54D', '#FFFFFF', '#FFFFFF', '#7FB2E5'];
    let parts = [], rockets = [], raf = 0, last = 0, dpr = 1;
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      fxCanvas.width = innerWidth * dpr; fxCanvas.height = innerHeight * dpr;
    }
    function burst(x, y, n = 70, power = 1) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = (1.5 + Math.random() * 5.5) * power;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: .012 + Math.random() * .014, r: 1.2 + Math.random() * 2, c: colors[i % colors.length] });
      }
    }
    function rocket(x0, y0, x1, y1) {
      rockets.push({ x: x0, y: y0, x1, y1, t: 0, dur: 38 + Math.random() * 14 });
    }
    function frame(now) {
      const k = Math.min(2.5, (now - (last || now)) / 16.67); last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = 'lighter';
      rockets = rockets.filter(r => {
        r.t += k;
        const p = Math.min(1, r.t / r.dur), e = 1 - Math.pow(1 - p, 3);
        const x = r.x + (r.x1 - r.x) * e, y = r.y + (r.y1 - r.y) * e;
        ctx.fillStyle = '#FFD08A'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill();
        if (p >= 1) { burst(x, y, 80, 1.1); return false; }
        return true;
      });
      parts = parts.filter(p => {
        p.vx *= Math.pow(.965, k); p.vy = p.vy * Math.pow(.965, k) + .07 * k;
        p.x += p.vx * k; p.y += p.vy * k; p.life -= p.decay * k;
        if (p.life <= 0) return false;
        ctx.globalAlpha = p.life; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
        return true;
      });
      ctx.globalAlpha = 1;
      if (parts.length || rockets.length) raf = requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, innerWidth, innerHeight); raf = 0; }
    }
    function run() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    addEventListener('resize', size); size();
    return {
      celebrate(x, y) {
        if (reduceMotion) return;
        burst(x, y, 90, 1.2); run();
        const W = innerWidth, H = innerHeight;
        [140, 360, 560, 820].forEach((d, i) => setTimeout(() => {
          rocket(x, y, W * (.15 + Math.random() * .7), H * (.12 + Math.random() * .3)); run();
        }, d + i * 20));
      },
    };
  })();

  /* ---------- brand paths for canvas (from the inline SVG sprite) ---------- */
  function symbolPaths(id) {
    const g = $(`#${id} g`);
    const m = (g.getAttribute('transform') || '').match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)\s*scale\(([-\d.]+)[ ,]+([-\d.]+)\)/);
    const [w, h] = $(`#${id}`).getAttribute('viewBox').split(/\s+/).slice(2).map(Number);
    return { w, h, t: m ? m.slice(1).map(Number) : [0, 0, 1, 1], paths: $$('path', g).map(p => new Path2D(p.getAttribute('d'))) };
  }
  let LOCKUP, SHIELD;
  function drawSymbol(ctx, sym, x, y, width, color) {
    const s = width / sym.w;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.translate(sym.t[0], sym.t[1]); ctx.scale(sym.t[2], sym.t[3]);
    ctx.fillStyle = color; sym.paths.forEach(p => ctx.fill(p));
    ctx.restore();
    return sym.h * s;
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrapLines(ctx, text, maxW) {
    const words = text.split(' '), lines = [];
    let line = '';
    words.forEach(w => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    return lines;
  }

  /* ---------- the personal pass, drawn at 1080×1350 ---------- */
  const SERIF = '"Instrument Serif", Georgia, "Times New Roman", serif';
  async function drawPass(name, photo, number) {
    await Promise.all([
      '400 100px "Fixture Ultra"', '700 20px Benzin', '600 20px Fixture', `italic 400 40px ${SERIF}`,
    ].map(f => document.fonts ? document.fonts.load(f, name) : 0));
    LOCKUP = LOCKUP || symbolPaths('lockup');
    SHIELD = SHIELD || symbolPaths('shield');

    const W = 1080, H = 1920;   // Instagram Stories 9:16
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    // background, like the poster
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#003B63'); g.addColorStop(.9, '#001E36');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, 900);
    g.addColorStop(0, 'rgba(13,76,131,.95)'); g.addColorStop(1, 'rgba(13,76,131,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.rotate(-9 * Math.PI / 180);
    ctx.font = '400 1900px "Fixture Ultra"'; ctx.fillStyle = 'rgba(120,180,235,.07)';
    ctx.fillText('PARTY', -260, 1760); ctx.restore();

    // card geometry (u = one "em" of the web pass)
    const u = 18, cw = 34 * u, stub = 8.4 * u, ch = 59.5 * u, pad = 2.4 * u;
    const card = document.createElement('canvas'); card.width = cw; card.height = ch;
    const c = card.getContext('2d');
    g = c.createLinearGradient(0, 0, cw, ch); g.addColorStop(.45, '#FFFFFF'); g.addColorStop(1, '#EEF2F6');
    rrect(c, 0, 0, cw, ch, 1.8 * u); c.fillStyle = g; c.fill();

    // head
    const lh = drawSymbol(c, LOCKUP, pad, 2.9 * u, 11.5 * u, '#0D4C83');
    c.fillStyle = '#0D4C83'; c.font = `700 ${1.05 * u}px Benzin`; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText('GUEST PASS', cw - pad, 2.9 * u + lh / 2);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(13,76,131,.16)'; c.fillRect(pad, 8.6 * u, cw - 2 * pad, 1.5);

    // photo
    const px = pad, py = 10.4 * u, ps = 12.4 * u;
    c.save(); rrect(c, px, py, ps, ps, 1.4 * u); c.clip();
    c.fillStyle = '#0D4C83'; c.fillRect(px, py, ps, ps);
    if (photo) {
      const iw = photo.width, ih = photo.height, sc = Math.max(ps / iw, ps / ih);
      c.drawImage(photo, px + (ps - iw * sc) / 2, py + (ps - ih * sc) / 2 - Math.max(0, (ih * sc - ps) * .12), iw * sc, ih * sc);
    }
    c.restore();

    // name
    const nx = px + ps + 1.8 * u, nw = cw - pad - nx;
    c.fillStyle = 'rgba(13,76,131,.6)'; c.font = `600 ${1.1 * u}px Fixture, sans-serif`;
    c.fillText('Guest', nx, py + 1.1 * u);
    let fs = 4.4 * u, lines;
    do {
      c.font = `italic 400 ${fs}px ${SERIF}`;
      lines = wrapLines(c, name, nw);
      if (lines.length <= 3 && lines.every(l => c.measureText(l).width <= nw)) break;
      fs -= .2 * u;
    } while (fs > 2.2 * u);
    c.fillStyle = '#0D4C83';
    lines.slice(0, 3).forEach((l, i) => c.fillText(l, nx, py + 2.4 * u + fs * .82 + i * fs * .98));
    c.fillStyle = '#FF9300'; c.font = `700 ${1 * u}px Benzin`;
    c.fillText('ON THE LIST', nx, py + ps - .2 * u);

    // numbers, fitted to the inner width
    c.font = '400 100px "Fixture Ultra"';
    const w1 = c.measureText('01.10').width, w2 = c.measureText('20:00').width;
    const F = Math.min(26 * u, 100 * (cw - 2 * pad - 2 * u) / (w1 + w2));
    const base = 25 * u + F * .7;
    c.font = `400 ${F}px "Fixture Ultra"`;
    c.fillStyle = '#0D4C83'; c.fillText('01.10', pad, base);
    c.fillStyle = '#FF9300'; c.textAlign = 'right'; c.fillText('20:00', cw - pad, base); c.textAlign = 'left';

    // meta
    const my = base + 2.6 * u, col2 = pad + (cw - 2 * pad) * .43;
    c.fillStyle = 'rgba(13,76,131,.6)'; c.font = `600 ${1.05 * u}px Fixture, sans-serif`;
    c.fillText('Thursday', pad, my); c.fillText('Nest One, 15th floor', col2, my);
    c.fillStyle = '#0D4C83'; c.font = `700 ${1.25 * u}px Benzin`;
    c.fillText('01.10.2026', pad, my + 1.8 * u); c.fillText('FRESHMAN OFFICE', col2, my + 1.8 * u);

    // perforation + stub
    const sy = ch - stub;
    c.fillStyle = 'rgba(13,76,131,.35)';
    for (let x = 1.6 * u; x < cw - 1.6 * u; x += u) c.fillRect(x, sy, u / 2, 2);
    c.fillStyle = '#FF9300'; c.font = `700 ${1.35 * u}px Benzin`;
    c.fillText('ADMIT ONE', pad, ch - 3.2 * u);
    if (number) {
      c.fillStyle = '#0D4C83'; c.font = `700 ${1.35 * u}px Benzin`; c.textAlign = 'right';
      c.fillText('NO. ' + passNo(number), cw - pad, ch - 3.2 * u); c.textAlign = 'left';
    } else drawSymbol(c, SHIELD, cw - pad - 2.3 * u, ch - 5.6 * u, 2.3 * u, '#0D4C83');

    // punch: lanyard slot + side notches
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.ellipse(cw / 2, 1.7 * u, 2.9 * u, .62 * u, 0, 0, 7); c.fill();
    [0, cw].forEach(x => { c.beginPath(); c.arc(x, sy, 1.35 * u, 0, 7); c.fill(); });
    c.globalCompositeOperation = 'source-over';

    // place the card: strap, card with shadow, clip — slightly tilted
    // top: brand lockup (clear of the Stories progress bar)
    drawSymbol(ctx, LOCKUP, 100, 250, 250, '#FFFFFF');

    const cx = W / 2, top = 440;
    ctx.save(); ctx.translate(cx, top); ctx.rotate(-3 * Math.PI / 180);
    const sw = 3.4 * u;
    ctx.fillStyle = '#FF9300'; ctx.fillRect(-sw / 2, -top - 200, sw, top + 200 + 1.2 * u);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-sw / 2, -top - 200, .35 * u, top + 200);
    ctx.save(); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#001E36'; ctx.font = `700 ${1.05 * u}px Benzin`;
    ctx.textBaseline = 'middle'; ctx.fillText('FRESHMAN BIRTHDAY PARTY    01.10.26    FRESHMAN', 2 * u, 0); ctx.restore();
    ctx.shadowColor = 'rgba(0,12,28,.55)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 34;
    ctx.drawImage(card, -cw / 2, 0);
    ctx.shadowColor = 'transparent';
    g = ctx.createLinearGradient(0, -.9 * u, 0, 2.3 * u);
    g.addColorStop(0, '#E6EBF0'); g.addColorStop(.7, '#9AA8B6'); g.addColorStop(1, '#7D8B99');
    rrect(ctx, -3.2 * u, -.9 * u, 6.4 * u, 3.2 * u, .7 * u); ctx.fillStyle = g; ctx.fill();
    rrect(ctx, -1.7 * u, .25 * u, 3.4 * u, .9 * u, .45 * u); ctx.fillStyle = 'rgba(0,30,54,.55)'; ctx.fill();
    ctx.restore();

    // first-person line for the guest's story (kept above the reply bar)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF'; ctx.font = '700 54px Benzin';
    ctx.fillText("I'M ON THE LIST.", 100, 1640);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '600 28px Fixture, sans-serif';
    ctx.fillText('Freshman Birthday Party  ·  01.10.26  ·  20:00–22:00  ·  Nest One', 100, 1692);
    if (isSet(CONFIG.instagram)) {
      ctx.fillStyle = '#FF9300'; ctx.font = '700 26px Benzin';
      ctx.fillText(CONFIG.instagram.toUpperCase(), 100, 1740);
    }
    return cv;
  }

  /* ---------- form state ---------- */
  const form = $('[data-form]');
  const nameInput = form.elements.name;
  const fileInput = $('[data-photo-input]');
  const drop = $('[data-drop]');
  const preview = $('[data-preview]');
  const submitBtn = $('[data-submit]');
  const statusEl = $('[data-status]');
  const shareBtn = $('[data-share]');
  const badgeImg = $('[data-badge]');
  let photoCanvas = null, photoData = '', passBlob = null, safeName = 'guest', listState = null;

  const STORE = 'freshman-bday-pass';
  const save = v => { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) {} };
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } };

  function showStep(step) {
    $$('.dlg__step', dialog).forEach(s => (s.hidden = s.dataset.step !== step));
    dialog.scrollTop = 0;
    fitAll();
  }
  function setError(field, msg) {
    const el = $(`[data-error="${field}"]`);
    const target = field === 'name' ? nameInput : field === 'photo' ? drop : null;
    el.textContent = msg || ''; el.hidden = !msg;
    if (target) target.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  // read + downscale the photo (also handles big phone photos)
  function readPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('type'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1000, s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); resolve(cv);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  async function takePhoto(file) {
    try {
      photoCanvas = await readPhoto(file);
      photoData = photoCanvas.toDataURL('image/jpeg', .85);
      preview.querySelector('img')?.remove();
      preview.appendChild(Object.assign(new Image(), { src: photoData, alt: '' }));
      $('[data-drop-title]').textContent = 'Change photo';
      setError('photo', '');
    } catch (e) {
      setError('photo', 'We couldn\'t open this file. Choose a JPG or PNG photo.');
    }
  }
  fileInput.addEventListener('change', () => fileInput.files[0] && takePhoto(fileInput.files[0]));
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('is-drag'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('is-drag'); }));
  drop.addEventListener('drop', e => e.dataTransfer.files[0] && takePhoto(e.dataTransfer.files[0]));
  nameInput.addEventListener('input', () => nameInput.value.trim().length > 1 && setError('name', ''));

  /* ---------- guest list (shared, lives in the Google Sheet) ---------- */
  const passNo = n => String(n).padStart(2, '0');
  const CLIENT_KEY = 'freshman-bday-client';
  const clientId = (() => {
    try {
      let id = localStorage.getItem(CLIENT_KEY);
      if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); localStorage.setItem(CLIENT_KEY, id); }
      return id;
    } catch (e) { return ''; }
  })();
  const hasOwnPass = () => { const s = load(); return !!(s && s.name); };

  function applyListState() {
    const spots = $$('[data-spots]');
    spots.forEach(el => (el.hidden = true));
    if (!listState || hasOwnPass()) return;
    if (listState.full) {
      $$('[data-rsvp]').forEach(el => { el.textContent = 'Guest list is full'; el.classList.add('is-closed'); });
      const t = $('[data-rsvp-text]');
      if (t) t.innerHTML = 'Every place is taken. <em>Thank you for wanting to be there.</em>';
      fitAll();
    } else if (listState.left <= CONFIG.spotsHint) {
      spots.forEach(el => { el.textContent = `Only ${listState.left} place${listState.left === 1 ? '' : 's'} left`; el.hidden = false; });
    }
  }
  async function fetchStatus() {
    if (!isSet(CONFIG.submitUrl)) return;
    try {
      const r = await fetch(CONFIG.submitUrl, { method: 'GET' });
      const data = await r.json();
      if (data && typeof data.count === 'number') { listState = data; applyListState(); }
    } catch (e) { /* offline or script not deployed: the POST still decides */ }
  }

  // Ask the sheet for a place. Returns { ok, number, updated } or { full } or throws.
  async function reservePlace(name) {
    const r = await fetch(CONFIG.submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // simple request: no CORS preflight
      body: JSON.stringify({ action: 'rsvp', clientId, name, guest: guest || '', photo: photoData }),
    });
    return r.json();
  }

  const fileName = () => `freshman-story-${safeName}.png`;
  const canShareFile = file => !!(navigator.canShare && navigator.canShare({ files: [file] }));
  function setupShareUI() {
    const file = new File([passBlob], fileName(), { type: 'image/png' });
    const share = canShareFile(file);
    const dl = $('[data-download]');
    shareBtn.hidden = !share;
    dl.classList.toggle('btn--ghost', share);            // Share is the main action on phones
    const tag = isSet(CONFIG.instagram) ? ` and tag ${CONFIG.instagram}` : '';
    const steps = share
      ? ['Tap <strong>Share to Stories</strong> and choose Instagram.', 'Pick <strong>Story</strong>' + tag + '.', 'Post it. See you on 1 October.']
      : ['Download the image and send it to your phone.', 'In Instagram, add it to your <strong>Story</strong>' + tag + '.', 'Post it. See you on 1 October.'];
    $('[data-how]').innerHTML = steps.map(s => `<li><span>${s}</span></li>`).join('');
    const igWrap = $('[data-ig-wrap]');
    if (isSet(CONFIG.instagram)) { $('[data-ig]').textContent = CONFIG.instagram; igWrap.hidden = false; }
  }

  async function showPass(name, photoSource, number) {
    const cv = await drawPass(name, photoSource, number);
    passBlob = await new Promise(r => cv.toBlob(r, 'image/png'));
    if (badgeImg.src.startsWith('blob:')) URL.revokeObjectURL(badgeImg.src);
    badgeImg.src = URL.createObjectURL(passBlob);
    safeName = name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '') || 'guest';
    setupShareUI();
    showStep('pass');
    badgeImg.classList.remove('is-in'); void badgeImg.offsetWidth; badgeImg.classList.add('is-in');
  }

  function setStatus(text, warn) {
    statusEl.textContent = text;
    statusEl.classList.toggle('is-warn', !!warn);
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = nameInput.value.replace(/\s+/g, ' ').trim();
    let ok = true;
    setError('form', '');
    if (name.length < 2) { setError('name', 'Add your full name.'); ok = false; } else setError('name', '');
    if (!photoCanvas) { setError('photo', 'Add a photo for your pass.'); ok = false; }
    if (!ok) { (name.length < 2 ? nameInput : fileInput).focus(); return; }

    submitBtn.disabled = true; submitBtn.textContent = 'Reserving your place…';
    try {
      let number = null, statusText, warn = false;
      if (!isSet(CONFIG.submitUrl)) {
        statusText = 'Demo mode: no guest list is connected, so this place isn\'t reserved. Set submitUrl in script.js.';
        warn = true;
      } else {
        let res;
        try { res = await reservePlace(name); }
        catch (err) { setError('form', 'We couldn\'t reach the guest list. Check your connection and try again.'); return; }
        if (res && res.full && !res.ok) {
          listState = res; applyListState(); showStep('full'); return;
        }
        if (!res || !res.ok) { setError('form', 'Something went wrong on our side. Try again in a minute.'); return; }
        number = res.number;
        listState = res;
        statusText = res.updated ? `Updated. You're still guest No. ${passNo(number)}.` : `Place reserved. You're guest No. ${passNo(number)}.`;
      }
      await showPass(name, photoCanvas, number);
      setStatus(statusText, warn);
      fx.celebrate(innerWidth / 2, innerHeight * .45);
      save({ name, photo: photoData, number });
      personalize(name);
      applyListState();
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = 'Get my pass';
    }
  });

  /* ---------- download / share / edit ---------- */
  $('[data-download]').addEventListener('click', () => {
    if (!passBlob) return;
    const url = URL.createObjectURL(passBlob);
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName() });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });
  shareBtn.addEventListener('click', async () => {
    try {
      await navigator.share({ files: [new File([passBlob], fileName(), { type: 'image/png' })], title: 'Freshman Birthday Party' });
    } catch (e) { /* user closed the share sheet */ }
  });
  $('[data-edit]').addEventListener('click', () => { showStep('form'); nameInput.focus(); });

  /* ---------- open / close ---------- */
  function openFlow(fromEl) {
    const own = hasOwnPass() && passBlob;
    const closed = !own && listState && listState.full;
    if (!closed) {
      const r = fromEl.getBoundingClientRect();
      fx.celebrate(r.left + r.width / 2, r.top + r.height / 2);
    }
    setTimeout(() => {
      dialog.appendChild(fxCanvas);           // keep fireworks above the dialog layer
      dialog.showModal();
      if (own) showStep('pass');
      else if (closed) showStep('full');
      else { showStep('form'); if (!matchMedia('(pointer: coarse)').matches) nameInput.focus(); }
    }, reduceMotion || closed ? 0 : 650);
  }
  $('[data-close-full]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.body.appendChild(fxCanvas));
  $('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  $$('[data-rsvp]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); openFlow(btn); }));

  /* ---------- returning guest: remember their pass ---------- */
  function personalize(name) {
    const first = name.split(' ')[0];
    $$('[data-guest]').forEach(el => (el.textContent = first + '.'));
    $$('[data-rsvp]').forEach(el => (el.textContent = 'My pass'));
  }
  const saved = load();
  if (saved && saved.name) {
    nameInput.value = saved.name;
    personalize(saved.name);
    if (saved.photo) {
      const img = new Image();
      img.onload = async () => {
        photoCanvas = img; photoData = saved.photo;
        preview.appendChild(Object.assign(new Image(), { src: saved.photo, alt: '' }));
        $('[data-drop-title]').textContent = 'Change photo';
        const cv = await drawPass(saved.name, img, saved.number);
        passBlob = await new Promise(r => cv.toBlob(r, 'image/png'));
        badgeImg.src = URL.createObjectURL(passBlob);
        safeName = saved.name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '') || 'guest';
        setupShareUI();
        if (saved.number) setStatus(`Place reserved. You're guest No. ${passNo(saved.number)}.`);
        else setStatus('Demo mode: no guest list is connected, so this place isn\'t reserved. Set submitUrl in script.js.', true);
      };
      img.src = saved.photo;
    }
  } else if (guest) {
    nameInput.value = guest;
  }
  fetchStatus();
})();
