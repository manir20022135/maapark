/**
 * growth-loop-widget.js
 * Anti-Gravity Growth Loop — FOMO Ticker, Slot Counter & Countdown Timer
 * National Clinical & Digital Health Nursing Championship 2026
 *
 * Zero-dependency embed. Works on any page by adding a single script tag:
 *   <script src="/growth-loop-widget.js"></script>
 *
 * The widget self-injects its DOM and styles. No global namespace pollution —
 * everything is wrapped in an IIFE.
 *
 * What it renders:
 *   1. Social Proof Ticker  — rotating registration events (bottom-left)
 *   2. Countdown Timer      — sticky countdown to 13 Sep 2026, 19:00 IST (top)
 *   3. Slot Counter         — live remaining slot bar (bottom-right corner badge)
 */

(function GrowthLoopWidget() {
  'use strict';

  // ─── Configuration ──────────────────────────────────────────────────────────
  const CONFIG = {
    // Deadline: Sunday, 13 September 2026, 18:30:00 IST (UTC+5:30)
    // UTC equivalent: 2026-09-13T13:00:00.000Z
    deadline: new Date('2026-09-13T13:00:00.000Z'),

    // API base — auto-detects localhost vs production
    apiBase: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : window.location.origin,

    // How often to rotate ticker events (ms)
    tickerInterval: 4500,

    // How often to poll slot count (ms) — don't hammer the API
    slotPollInterval: 60_000,

    // Fallback seed events shown while API loads
    seedEvents: [
      { text: 'Priyanka from Gauhati Medical College just registered', timeLabel: '2m ago' },
      { text: 'Anjali Kumari from AIIMS Bhubaneswar just registered', timeLabel: '5m ago' },
      { text: 'Suresh R. from Manipal College of Nursing just registered', timeLabel: '9m ago' },
      { text: 'Deepa V. from St. John\'s Medical College just registered', timeLabel: '14m ago' },
      { text: 'Ramesh from JIPMER Puducherry just registered', timeLabel: '18m ago' },
      { text: 'Sneha from AIIMS Jodhpur just registered', timeLabel: '23m ago' },
      { text: 'Kavya from Kasturba Medical College just registered', timeLabel: '31m ago' },
    ],
  };

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const CSS = `
    #glw-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; }

    /* ── Countdown Timer Bar ── */
    #glw-countdown-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9990;
      background: linear-gradient(135deg, #6C3FE8 0%, #9B67FF 50%, #00D4AA 100%);
      color: #fff;
      padding: 8px 16px;
      display: flex; align-items: center; justify-content: center; gap: 16px;
      font-size: 13px; font-weight: 600;
      box-shadow: 0 2px 20px rgba(108,63,232,0.4);
      transform: translateY(-100%);
      transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
      flex-wrap: wrap;
    }
    #glw-countdown-bar.visible { transform: translateY(0); }
    #glw-countdown-bar.urgent {
      background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
      animation: glw-urgent-pulse 2s ease-in-out infinite alternate;
    }
    @keyframes glw-urgent-pulse {
      from { box-shadow: 0 2px 20px rgba(255,107,107,0.4); }
      to   { box-shadow: 0 2px 40px rgba(255,107,107,0.7); }
    }
    .glw-cd-label {
      opacity: 0.85; font-weight: 500; font-size: 12px;
      white-space: nowrap;
    }
    .glw-cd-units {
      display: flex; align-items: center; gap: 4px;
    }
    .glw-cd-block {
      display: flex; flex-direction: column; align-items: center;
      background: rgba(0,0,0,0.2); border-radius: 6px;
      padding: 4px 10px; min-width: 48px;
    }
    .glw-cd-val {
      font-size: 18px; font-weight: 800; line-height: 1;
      font-variant-numeric: tabular-nums; letter-spacing: -0.5px;
    }
    .glw-cd-unit-label { font-size: 9px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .glw-cd-colon { font-size: 18px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; }
    .glw-cd-cta {
      background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.3);
      border-radius: 100px; padding: 5px 14px;
      font-size: 12px; font-weight: 700; color: #fff; text-decoration: none;
      white-space: nowrap; transition: background 0.2s ease;
    }
    .glw-cd-cta:hover { background: rgba(0,0,0,0.4); }
    #glw-countdown-bar .glw-close {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: rgba(0,0,0,0.2); border: none; border-radius: 50%;
      width: 22px; height: 22px; cursor: pointer; color: rgba(255,255,255,0.7);
      font-size: 13px; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s ease;
    }
    #glw-countdown-bar .glw-close:hover { background: rgba(0,0,0,0.4); color: #fff; }

    /* ── Social Proof Ticker ── */
    #glw-ticker {
      position: fixed; bottom: 24px; left: 16px; z-index: 9980;
      max-width: min(380px, calc(100vw - 32px));
      background: rgba(18,18,42,0.92);
      border: 1px solid rgba(108,63,232,0.4);
      border-radius: 14px;
      padding: 12px 14px 12px 12px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(108,63,232,0.1);
      backdrop-filter: blur(16px);
      display: flex; align-items: flex-start; gap: 10px;
      transform: translateX(-120%);
      transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
    }
    #glw-ticker.visible { transform: translateX(0); }
    #glw-ticker.hide-left { transform: translateX(-120%); }
    .glw-ticker-avatar {
      width: 36px; height: 36px; flex-shrink: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, #6C3FE8, #00D4AA);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: #fff; font-weight: 700;
    }
    .glw-ticker-body { flex: 1; min-width: 0; }
    .glw-ticker-text {
      font-size: 13px; color: #E0E0F8; font-weight: 500;
      line-height: 1.4; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .glw-ticker-meta {
      margin-top: 4px; font-size: 11px; color: rgba(160,160,192,0.8);
      display: flex; align-items: center; gap: 6px;
    }
    .glw-ticker-dot { width: 6px; height: 6px; border-radius: 50%; background: #00D4AA; flex-shrink: 0; animation: glw-dot-pulse 1.5s ease-in-out infinite; }
    @keyframes glw-dot-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
    .glw-ticker-close {
      flex-shrink: 0; align-self: flex-start;
      background: none; border: none; cursor: pointer;
      color: rgba(160,160,192,0.5); font-size: 14px; padding: 0; line-height: 1;
      transition: color 0.2s;
    }
    .glw-ticker-close:hover { color: rgba(160,160,192,0.9); }

    /* ── Slot Counter Badge ── */
    #glw-slots {
      position: fixed; bottom: 24px; right: 16px; z-index: 9980;
      background: rgba(18,18,42,0.92);
      border: 1px solid rgba(255,215,0,0.3);
      border-radius: 14px; padding: 12px 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5);
      backdrop-filter: blur(16px);
      min-width: 160px; text-align: center;
      transform: translateX(120%);
      transition: transform 0.5s cubic-bezier(0.4,0,0.2,1) 0.2s;
    }
    #glw-slots.visible { transform: translateX(0); }
    .glw-slots-emoji { font-size: 22px; margin-bottom: 4px; }
    .glw-slots-num {
      font-size: 28px; font-weight: 800; line-height: 1;
      font-variant-numeric: tabular-nums;
      background: linear-gradient(135deg, #FFD700, #FF8E53);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .glw-slots-label { font-size: 10px; color: rgba(160,160,192,0.7); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .glw-slots-bar-track {
      width: 100%; height: 4px; background: rgba(255,255,255,0.08);
      border-radius: 100px; margin-top: 10px; overflow: hidden;
    }
    .glw-slots-bar-fill {
      height: 100%; border-radius: 100px;
      background: linear-gradient(90deg, #00D4AA, #FFD700);
      transition: width 1s cubic-bezier(0.4,0,0.2,1);
    }
    .glw-slots-urgency {
      font-size: 10px; font-weight: 700; margin-top: 6px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .glw-urgency-critical { color: #FF6B6B; }
    .glw-urgency-high { color: #FF8E53; }
    .glw-urgency-normal { color: #00D4AA; }

    /* ── Responsive adjustments ── */
    @media (max-width: 480px) {
      #glw-ticker { bottom: 16px; left: 8px; max-width: calc(100vw - 16px - 180px); }
      #glw-slots  { bottom: 16px; right: 8px; min-width: 130px; }
      .glw-cd-val { font-size: 15px; }
      .glw-cd-block { padding: 3px 8px; min-width: 40px; }
    }
    @media (max-width: 360px) {
      #glw-ticker { display: none; }
    }
  `;

  // ─── DOM Injection ────────────────────────────────────────────────────────────
  function inject() {
    // Styles
    const style = document.createElement('style');
    style.id = 'glw-styles';
    style.textContent = CSS;
    document.head.appendChild(style);

    // ── Countdown Bar ──────────────────────────────────────────────────────────
    const bar = document.createElement('div');
    bar.id = 'glw-countdown-bar';
    bar.innerHTML = `
      <span class="glw-cd-label">🏆 Registration closes in</span>
      <div class="glw-cd-units">
        <div class="glw-cd-block"><span class="glw-cd-val" id="glw-cd-d">--</span><span class="glw-cd-unit-label">Days</span></div>
        <span class="glw-cd-colon">:</span>
        <div class="glw-cd-block"><span class="glw-cd-val" id="glw-cd-h">--</span><span class="glw-cd-unit-label">Hrs</span></div>
        <span class="glw-cd-colon">:</span>
        <div class="glw-cd-block"><span class="glw-cd-val" id="glw-cd-m">--</span><span class="glw-cd-unit-label">Min</span></div>
        <span class="glw-cd-colon">:</span>
        <div class="glw-cd-block"><span class="glw-cd-val" id="glw-cd-s">--</span><span class="glw-cd-unit-label">Sec</span></div>
      </div>
      <a href="/championship.html" class="glw-cd-cta">Register Now ₹99 →</a>
      <button class="glw-close" id="glw-cd-close" aria-label="Close countdown bar">✕</button>
    `;
    document.body.prepend(bar);

    // ── Social Proof Ticker ────────────────────────────────────────────────────
    const ticker = document.createElement('div');
    ticker.id = 'glw-ticker';
    ticker.setAttribute('aria-live', 'polite');
    ticker.setAttribute('aria-atomic', 'true');
    ticker.innerHTML = `
      <div class="glw-ticker-avatar" id="glw-ticker-avatar">P</div>
      <div class="glw-ticker-body">
        <div class="glw-ticker-text" id="glw-ticker-text">Loading…</div>
        <div class="glw-ticker-meta">
          <span class="glw-ticker-dot"></span>
          <span id="glw-ticker-time">just now</span>
        </div>
      </div>
      <button class="glw-ticker-close" id="glw-ticker-close" aria-label="Dismiss">✕</button>
    `;
    document.body.appendChild(ticker);

    // ── Slot Counter ───────────────────────────────────────────────────────────
    const slots = document.createElement('div');
    slots.id = 'glw-slots';
    slots.innerHTML = `
      <div class="glw-slots-emoji">🎟️</div>
      <div class="glw-slots-num" id="glw-slots-num">--</div>
      <div class="glw-slots-label">Slots Remaining</div>
      <div class="glw-slots-bar-track">
        <div class="glw-slots-bar-fill" id="glw-slots-fill" style="width:0%"></div>
      </div>
      <div class="glw-slots-urgency" id="glw-slots-urgency"></div>
    `;
    document.body.appendChild(slots);
  }

  // ─── Countdown Timer ──────────────────────────────────────────────────────────
  function startCountdown() {
    // If page already has its own native urgency-header (like championship.html), don't inject a duplicate top bar
    if (document.querySelector('.urgency-header')) return;

    const bar    = document.getElementById('glw-countdown-bar');
    const dEl    = document.getElementById('glw-cd-d');
    const hEl    = document.getElementById('glw-cd-h');
    const mEl    = document.getElementById('glw-cd-m');
    const sEl    = document.getElementById('glw-cd-s');
    const closeB = document.getElementById('glw-cd-close');

    if (!bar || !closeB) return;

    // Check if user dismissed
    if (sessionStorage.getItem('glw-cd-dismissed')) return;

    closeB.addEventListener('click', () => {
      bar.style.transition = 'transform 0.4s ease';
      bar.style.transform = 'translateY(-100%)';
      sessionStorage.setItem('glw-cd-dismissed', '1');
    });

    const pad = (n) => String(n).padStart(2, '0');

    function tick() {
      const now = Date.now();
      const diff = CONFIG.deadline.getTime() - now;

      if (diff <= 0) {
        dEl.textContent = hEl.textContent = mEl.textContent = sEl.textContent = '00';
        bar.classList.add('urgent');
        clearInterval(countdown);
        return;
      }

      const totalSecs = Math.floor(diff / 1000);
      const d = Math.floor(totalSecs / 86400);
      const h = Math.floor((totalSecs % 86400) / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;

      dEl.textContent = pad(d);
      hEl.textContent = pad(h);
      mEl.textContent = pad(m);
      sEl.textContent = pad(s);

      // Urgent mode in last 3 days
      if (d < 3) bar.classList.add('urgent');
    }

    let countdown = null;
    tick();
    if (CONFIG.deadline.getTime() - Date.now() > 0) {
      countdown = setInterval(tick, 1000);
    }

    // Show bar with a slight delay for visual polish
    setTimeout(() => bar.classList.add('visible'), 400);
  }

  // ─── Social Proof Ticker ──────────────────────────────────────────────────────
  const INITIALS_COLORS = ['#6C3FE8','#00D4AA','#FF6B6B','#9B67FF','#FFD700','#FF8E53'];
  let tickerEvents = [];
  let tickerIndex  = 0;
  let tickerTimer  = null;

  function getInitial(text) {
    const match = text.match(/^(\w)/);
    return match ? match[1].toUpperCase() : '?';
  }

  function rotateColor(i) {
    return INITIALS_COLORS[i % INITIALS_COLORS.length];
  }

  function showTickerEvent(i) {
    if (!tickerEvents.length) return;
    const ev = tickerEvents[i % tickerEvents.length];
    const tickerEl  = document.getElementById('glw-ticker');
    const textEl    = document.getElementById('glw-ticker-text');
    const timeEl    = document.getElementById('glw-ticker-time');
    const avatarEl  = document.getElementById('glw-ticker-avatar');

    // Slide out
    tickerEl.classList.add('hide-left');

    setTimeout(() => {
      textEl.textContent = ev.text;
      timeEl.textContent = ev.timeLabel;
      avatarEl.textContent = getInitial(ev.text);
      avatarEl.style.background = `linear-gradient(135deg, ${rotateColor(i)}, ${rotateColor(i+2)})`;

      // Slide back in
      tickerEl.classList.remove('hide-left');
    }, 350);
  }

  async function fetchTickerEvents() {
    try {
      const resp = await fetch(`${CONFIG.apiBase}/api/growth/social-proof?limit=20`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!resp.ok) throw new Error('API error');
      const data = await resp.json();
      if (data.events && data.events.length > 0) {
        tickerEvents = data.events;
      }
    } catch (_) {
      // Silently fall back to seed events — already set
    }
  }

  function startTicker() {
    if (sessionStorage.getItem('glw-ticker-dismissed')) return;

    tickerEvents = [...CONFIG.seedEvents]; // start with seeds immediately

    const tickerEl = document.getElementById('glw-ticker');
    const closeBtn = document.getElementById('glw-ticker-close');

    closeBtn.addEventListener('click', () => {
      tickerEl.style.transition = 'transform 0.4s ease';
      tickerEl.style.transform = 'translateX(-120%)';
      clearInterval(tickerTimer);
      sessionStorage.setItem('glw-ticker-dismissed', '1');
    });

    // Show after short delay
    setTimeout(() => {
      tickerEl.classList.add('visible');
      showTickerEvent(0);

      // Fetch real data in background
      fetchTickerEvents();

      tickerTimer = setInterval(() => {
        tickerIndex++;
        showTickerEvent(tickerIndex);
      }, CONFIG.tickerInterval);
    }, 1500);
  }

  // ─── Slot Counter ─────────────────────────────────────────────────────────────
  function animateNumber(el, targetVal, duration = 800) {
    const start = parseInt(el.textContent.replace(/,/g, '')) || 0;
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (targetVal - start) * eased);
      el.textContent = current.toLocaleString('en-IN');
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  async function fetchSlots() {
    const numEl     = document.getElementById('glw-slots-num');
    const fillEl    = document.getElementById('glw-slots-fill');
    const urgencyEl = document.getElementById('glw-slots-urgency');
    const slotsEl   = document.getElementById('glw-slots');

    try {
      const resp = await fetch(`${CONFIG.apiBase}/api/growth/slots`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!resp.ok) throw new Error('API error');
      const { slots } = await resp.json();

      animateNumber(numEl, slots.remaining);

      // Filled % from right (slots filling up from 0 → 100%)
      fillEl.style.width = `${slots.percentFilled}%`;

      // Urgency label
      const urg = slots.urgencyLevel;
      if (urg === 'CRITICAL') {
        urgencyEl.textContent = '🔥 Almost Full!';
        urgencyEl.className   = 'glw-slots-urgency glw-urgency-critical';
        slotsEl.style.borderColor = 'rgba(255,107,107,0.5)';
      } else if (urg === 'HIGH') {
        urgencyEl.textContent = '⚡ Filling Fast';
        urgencyEl.className   = 'glw-slots-urgency glw-urgency-high';
      } else {
        urgencyEl.textContent = '✅ Seats Available';
        urgencyEl.className   = 'glw-slots-urgency glw-urgency-normal';
      }
    } catch (_) {
      // Show a fallback static count on error
      numEl.textContent = '847';
      fillEl.style.width = '15%';
      urgencyEl.textContent = '✅ Seats Available';
      urgencyEl.className = 'glw-slots-urgency glw-urgency-normal';
    }
  }

  function startSlotCounter() {
    const slotsEl = document.getElementById('glw-slots');
    setTimeout(() => {
      slotsEl.classList.add('visible');
      fetchSlots();
      setInterval(fetchSlots, CONFIG.slotPollInterval);
    }, 800);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────────
  function boot() {
    inject();
    startCountdown();
    startTicker();
    startSlotCounter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(); // End IIFE
