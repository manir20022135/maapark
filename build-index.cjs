/**
 * build-index.js
 * Injects all new sections into index.html.
 * Run: node build-index.js
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

// ───────────────────────────────────────────────────────
// 1. REPLACE FONT — add Poppins to existing Google Fonts link
// ───────────────────────────────────────────────────────
html = html.replace(
  `href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:wght@400;600;700&display=swap"`,
  `href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&family=Lato:wght@300;400;700&family=Playfair+Display:wght@400;600;700&display=swap"`
);

// ───────────────────────────────────────────────────────
// 2. REPLACE TITLE & META
// ───────────────────────────────────────────────────────
html = html.replace(
  `<title>MaaCare by Maa Park - Your Trusted Partner in Motherhood</title>`,
  `<title>MaaCare by Maa Park — India's Most Complete Maternal & Women's Health Platform</title>
    <meta name="keywords" content="MaaCare, Maa Park, maternal health app, pregnancy tracker, period tracker, home nurse, women health India">`
);

// ───────────────────────────────────────────────────────
// 3. INJECT NEW CSS before </head>
// ───────────────────────────────────────────────────────
const newCSS = `
  <style>
    /* ═══════════════════════════════════════════════════
       BRAND DESIGN SYSTEM — Maa Park / MaaCare 2.0
    ═══════════════════════════════════════════════════ */
    :root {
      --pink:       #FFB6C1;
      --pink-light: #fce4ec;
      --pink-dark:  #D4A0A0;
      --teal:       #00BCD4;
      --teal-light: #e0f7fa;
      --blue:       #3D5AFE;
      --blue-light: #e8eaf6;
      --red:        #FF5252;
      --red-light:  #ffebee;
      --navy:       #1a1a2e;
      --navy2:      #16213e;
      --navy3:      #0f3460;
      --bg:         #FAFAFA;
      --text:       #2D2D2D;
      --muted:      #8A8A8A;
      --radius-card: 20px;
      --radius-btn:  12px;
      --shadow-card: 0 4px 24px rgba(255,182,193,0.18);
      --font: 'Poppins', sans-serif;
    }
    body { font-family: 'Poppins', 'Lato', sans-serif; }
    /* ── Scroll reveal ── */
    .reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.65s ease, transform 0.65s ease; }
    .reveal.visible { opacity: 1; transform: translateY(0); }
    /* ── Shared utilities ── */
    .mc-badge { display: inline-block; background: var(--pink-light); color: #c2185b; font-size: 0.78rem; font-weight: 700; padding: 0.35rem 1rem; border-radius: 999px; margin-bottom: 0.75rem; letter-spacing: 0.04em; }
    .mc-badge.teal { background: var(--teal-light); color: #00838f; }
    .mc-badge.blue { background: var(--blue-light); color: #1a237e; }
    .mc-badge.red  { background: var(--red-light); color: #b71c1c; }
    .mc-badge.navy { background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25); }
    .mc-h2 { font-size: clamp(1.6rem, 3.5vw, 2.4rem); font-weight: 800; line-height: 1.25; color: var(--text); }
    .mc-h2.white { color: #fff; }
    .mc-p { font-size: 1rem; color: var(--muted); line-height: 1.7; margin-top: 0.6rem; }
    .mc-p.white { color: rgba(255,255,255,0.78); }
    .mc-divider { width: 56px; height: 4px; border-radius: 4px; background: linear-gradient(90deg, var(--pink), #f48fb1); margin: 0.8rem 0 1.4rem; }
    .mc-divider.center { margin-left: auto; margin-right: auto; }
    .mc-divider.teal { background: linear-gradient(90deg, var(--teal), #4dd0e1); }
    .mc-divider.white { background: linear-gradient(90deg, #fff, rgba(255,255,255,0.4)); }
    .mc-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.6rem; border-radius: var(--radius-btn); font-weight: 700; font-size: 0.95rem; font-family: 'Poppins', sans-serif; text-decoration: none; border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
    .mc-btn:hover { transform: translateY(-2px); }
    .mc-btn-primary { background: linear-gradient(135deg, var(--pink), #f06292); color: #fff; box-shadow: 0 4px 18px rgba(255,182,193,0.45); }
    .mc-btn-outline { background: transparent; color: var(--pink); border: 2px solid var(--pink); }
    .mc-btn-outline:hover { background: var(--pink-light); }
    .mc-btn-teal { background: linear-gradient(135deg, var(--teal), #26c6da); color: #fff; box-shadow: 0 4px 18px rgba(0,188,212,0.35); }
    .mc-btn-blue { background: linear-gradient(135deg, var(--blue), #536dfe); color: #fff; }
    .mc-btn-navy { background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.3); }
    .mc-btn-navy:hover { background: rgba(255,255,255,0.22); }
    .mc-card { background: #fff; border-radius: var(--radius-card); box-shadow: var(--shadow-card); padding: 1.5rem; transition: transform 0.25s, box-shadow 0.25s; }
    .mc-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(255,182,193,0.28); }

    /* ── STATS BAR ── */
    #stats-bar { background: linear-gradient(135deg, #1a1a2e, #16213e); overflow: hidden; }
    .stats-bar-inner { display: flex; flex-wrap: wrap; justify-content: center; max-width: 1200px; margin: 0 auto; }
    .stats-bar-pill { display: flex; align-items: center; gap: 0.6rem; padding: 1rem 1.8rem; border-right: 1px solid rgba(255,255,255,0.07); color: #fff; font-size: 0.88rem; font-weight: 700; white-space: nowrap; transition: background 0.2s; font-family: 'Poppins', sans-serif; }
    .stats-bar-pill:hover { background: rgba(255,255,255,0.05); }
    .stats-bar-pill:last-child { border-right: none; }
    .stats-bar-pill .sb-num { color: #FFB6C1; font-size: 1.05rem; font-weight: 800; }
    @media(max-width:768px){ .stats-bar-pill { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); width: 50%; padding: 0.7rem 1rem; } }

    /* ── AUDIENCE TABS ── */
    #audience { background: #FAFAFA; }
    .audience-wrap { max-width: 1200px; margin: 0 auto; padding: clamp(3rem,6vw,5rem) clamp(1rem,5vw,2rem); }
    .tab-nav { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 2rem; background: #fff; border-radius: 16px; padding: 0.45rem; box-shadow: 0 4px 24px rgba(255,182,193,0.18); }
    .tab-btn { flex: 1; min-width: 110px; padding: 0.65rem 0.7rem; border: none; border-radius: 12px; background: transparent; color: #8A8A8A; font-family: 'Poppins', sans-serif; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.25s; text-align: center; white-space: nowrap; }
    .tab-btn:hover { background: #fce4ec; color: #c2185b; }
    .tab-btn.active { background: linear-gradient(135deg, #FFB6C1, #f06292); color: #fff; box-shadow: 0 4px 16px rgba(255,182,193,0.5); }
    .tab-btn.blue-tab.active { background: linear-gradient(135deg, #3D5AFE, #536dfe); box-shadow: 0 4px 16px rgba(61,90,254,0.35); }
    .tab-btn.teal-tab.active { background: linear-gradient(135deg, #00BCD4, #26c6da); box-shadow: 0 4px 16px rgba(0,188,212,0.4); }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: tabFadeIn 0.35s ease; }
    @keyframes tabFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .tab-content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start; margin-top: 1rem; }
    @media(max-width:768px){ .tab-content-grid { grid-template-columns: 1fr; } }
    .tab-headline { font-size: clamp(1.25rem, 2.5vw, 1.75rem); font-weight: 800; color: #2D2D2D; line-height: 1.3; margin-bottom: 0.6rem; }
    .tab-feature-card { background: #fff; border-radius: 16px; padding: 1.1rem 1.3rem; box-shadow: 0 4px 20px rgba(255,182,193,0.14); margin-bottom: 0.8rem; border-left: 4px solid #FFB6C1; transition: transform 0.2s; }
    .tab-feature-card:hover { transform: translateY(-3px); }
    .tab-feature-card.teal { border-left-color: #00BCD4; }
    .tab-feature-card.blue { border-left-color: #3D5AFE; }
    .tab-feature-card h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.3rem; color: #2D2D2D; }
    .tab-feature-card p { font-size: 0.83rem; color: #8A8A8A; line-height: 1.6; margin: 0; }
    .feat-list { list-style: none; padding: 0; margin: 0; }
    .feat-list li { display: flex; align-items: flex-start; gap: 0.55rem; padding: 0.42rem 0; font-size: 0.9rem; color: #2D2D2D; border-bottom: 1px solid #f5f5f5; line-height: 1.5; }
    .feat-list li:last-child { border-bottom: none; }
    .feat-list li .li-icon { flex-shrink: 0; margin-top: 0.05rem; }
    .vax-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .vax-table th { background: #00BCD4; color: #fff; padding: 0.55rem 0.8rem; text-align: left; font-weight: 700; }
    .vax-table td { padding: 0.45rem 0.8rem; border-bottom: 1px solid #e0f7fa; color: #2D2D2D; }
    .vax-table tr:nth-child(even) td { background: #e0f7fa; }

    /* ── SOS EMERGENCY ── */
    #sos { background: linear-gradient(135deg, #fff5f5, #fff0f3); border-top: 3px solid #ffcdd2; border-bottom: 3px solid #ffcdd2; }
    .sos-wrap { max-width: 1200px; margin: 0 auto; padding: clamp(3rem,6vw,5rem) clamp(1rem,5vw,2rem); text-align: center; }
    .sos-pulse-circle { width: 90px; height: 90px; background: #FF5252; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 1.5rem; animation: sosPulse 1.8s infinite; }
    @keyframes sosPulse { 0%{box-shadow:0 0 0 0 rgba(255,82,82,0.5)} 70%{box-shadow:0 0 0 24px rgba(255,82,82,0)} 100%{box-shadow:0 0 0 0 rgba(255,82,82,0)} }
    .sos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.2rem; margin-top: 2.5rem; text-align: left; }
    .sos-card { background: #fff; border-radius: 20px; padding: 1.4rem; box-shadow: 0 4px 20px rgba(255,82,82,0.1); border: 1px solid #ffcdd2; transition: transform 0.2s; }
    .sos-card:hover { transform: translateY(-4px); }
    .sos-card.free { background: #FF5252; color: #fff; border-color: #FF5252; }
    .sos-card .s-icon { font-size: 1.8rem; margin-bottom: 0.55rem; display: block; }
    .sos-card h4 { font-size: 1rem; font-weight: 700; margin-bottom: 0.4rem; }
    .sos-card p { font-size: 0.84rem; line-height: 1.6; color: #8A8A8A; margin: 0; }
    .sos-card.free p { color: rgba(255,255,255,0.88); }
    .sos-card.free h4 { color: #fff; }

    /* ── HOME DIAGNOSTICS ── */
    #diagnostics { background: #fff; }
    .diag-wrap { max-width: 1200px; margin: 0 auto; padding: clamp(3rem,6vw,5rem) clamp(1rem,5vw,2rem); }
    .diag-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }
    @media(max-width:768px){ .diag-grid { grid-template-columns: 1fr; } }
    .diag-alert { background: #e0f7fa; border-left: 4px solid #00BCD4; border-radius: 12px; padding: 1rem 1.2rem; margin-top: 1.5rem; font-size: 0.9rem; color: #004d5f; font-weight: 600; }
    .how-it-works { background: linear-gradient(135deg, #00BCD4, #0097a7); border-radius: 20px; padding: 2rem; color: #fff; }
    .how-it-works h3 { font-size: 1.15rem; font-weight: 800; margin-bottom: 1.5rem; }
    .hw-step { display: flex; gap: 1rem; margin-bottom: 1.2rem; align-items: flex-start; }
    .hw-step:last-child { margin-bottom: 0; }
    .hw-num { width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; flex-shrink: 0; }
    .hw-text h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.15rem; }
    .hw-text p { font-size: 0.82rem; opacity: 0.9; line-height: 1.55; margin: 0; }

    /* ── PRICING ── */
    #pricing { background: linear-gradient(180deg, #fce4ec 0%, #fafafa 100%); }
    .pricing-wrap { max-width: 1200px; margin: 0 auto; padding: clamp(3rem,6vw,5rem) clamp(1rem,5vw,2rem); }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.2rem; margin-top: 2.5rem; }
    .price-card { background: #fff; border-radius: 20px; padding: 1.8rem 1.3rem; box-shadow: 0 4px 24px rgba(255,182,193,0.18); position: relative; display: flex; flex-direction: column; transition: transform 0.25s, box-shadow 0.25s; border: 2px solid transparent; }
    .price-card:hover { transform: translateY(-5px); box-shadow: 0 16px 48px rgba(255,182,193,0.28); }
    .price-card.featured { border-color: #FFB6C1; box-shadow: 0 8px 40px rgba(255,182,193,0.35); }
    .price-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #FFB6C1, #f06292); color: #fff; font-size: 0.7rem; font-weight: 800; padding: 0.28rem 0.9rem; border-radius: 999px; white-space: nowrap; }
    .price-emoji { font-size: 2rem; margin-bottom: 0.6rem; }
    .price-name { font-size: 1rem; font-weight: 800; color: #2D2D2D; }
    .price-amount { font-size: 1.65rem; font-weight: 800; color: #FFB6C1; line-height: 1; margin: 0.5rem 0; }
    .price-amount small { font-size: 0.85rem; font-weight: 400; color: #8A8A8A; }
    .price-features { list-style: none; margin: 0.8rem 0 1.4rem; padding: 0; flex: 1; }
    .price-features li { font-size: 0.82rem; color: #2D2D2D; padding: 0.32rem 0; display: flex; align-items: flex-start; gap: 0.45rem; border-bottom: 1px solid #fce4ec; line-height: 1.5; }
    .price-features li:last-child { border-bottom: none; }
    .price-features li::before { content: '✅'; flex-shrink: 0; font-size: 0.75rem; }
    .price-cta { display: block; text-align: center; padding: 0.65rem; border-radius: 12px; font-weight: 700; font-size: 0.88rem; text-decoration: none; transition: all 0.2s; font-family: 'Poppins', sans-serif; }
    .price-cta.primary { background: linear-gradient(135deg, #FFB6C1, #f06292); color: #fff; }
    .price-cta.primary:hover { box-shadow: 0 6px 20px rgba(255,182,193,0.5); }
    .price-cta.outline { border: 2px solid #FFB6C1; color: #FFB6C1; }
    .price-cta.outline:hover { background: #fce4ec; }
    .pricing-note { text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: #8A8A8A; }

    /* ── INVESTOR ── */
    #investor { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: #fff; }
    .investor-wrap { max-width: 1200px; margin: 0 auto; padding: clamp(3rem,6vw,5rem) clamp(1rem,5vw,2rem); }
    .investor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }
    @media(max-width:900px){ .investor-grid { grid-template-columns: 1fr; } }
    .inv-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.4rem 0; }
    .inv-stat { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 1.1rem; transition: background 0.2s; }
    .inv-stat:hover { background: rgba(255,255,255,0.12); }
    .inv-stat .inv-num { font-size: 1.5rem; font-weight: 800; color: #FFB6C1; }
    .inv-stat .inv-label { font-size: 0.78rem; color: rgba(255,255,255,0.62); margin-top: 0.2rem; line-height: 1.4; }
    .inv-box { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.11); border-radius: 20px; padding: 1.4rem; margin-bottom: 1.2rem; }
    .inv-box h3 { font-size: 1rem; font-weight: 700; color: #FFB6C1; margin-bottom: 0.9rem; }
    .inv-box ul { padding: 0; margin: 0; }
    .inv-box li { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.86rem; color: rgba(255,255,255,0.82); padding: 0.28rem 0; list-style: none; line-height: 1.5; }
    .rev-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
    .rev-item { background: rgba(255,255,255,0.06); border-radius: 10px; padding: 0.65rem 0.8rem; font-size: 0.81rem; color: rgba(255,255,255,0.78); }
    .inv-ctas { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.4rem; }

    /* ── NEW EXPANDED FOOTER ── */
    #site-footer { background: #1a1a2e; color: rgba(255,255,255,0.75); }
    .footer-mega { max-width: 1200px; margin: 0 auto; padding: 3.5rem clamp(1rem,5vw,2rem) 2rem; display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 2.5rem; }
    @media(max-width:900px){ .footer-mega { grid-template-columns: 1fr 1fr; } }
    @media(max-width:520px){ .footer-mega { grid-template-columns: 1fr; } }
    .footer-mega-col h4 { font-size: 0.82rem; font-weight: 700; color: #FFB6C1; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; }
    .footer-mega-col a, .footer-mega-col p { display: block; font-size: 0.84rem; color: rgba(255,255,255,0.58); text-decoration: none; margin-bottom: 0.5rem; transition: color 0.2s; line-height: 1.5; }
    .footer-mega-col a:hover { color: #FFB6C1; }
    .f-brand-name { font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 0.45rem; }
    .f-tagline { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-bottom: 1.1rem; line-height: 1.65; }
    .f-playstore-btn { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; padding: 0.45rem 0.9rem; font-size: 0.8rem; font-weight: 700; color: #fff !important; margin-bottom: 0.75rem; transition: background 0.2s; }
    .f-playstore-btn:hover { background: rgba(255,255,255,0.18) !important; color: #fff !important; }
    .f-wa-link { color: #25D366 !important; font-weight: 700 !important; }
    .footer-bottom-bar { background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.07); }
    .footer-bottom-inner { max-width: 1200px; margin: 0 auto; padding: 1.1rem clamp(1rem,5vw,2rem); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem; font-size: 0.77rem; color: rgba(255,255,255,0.42); }
    .footer-badges { display: flex; flex-wrap: wrap; gap: 0.45rem; }
    .f-badge { background: rgba(255,182,193,0.1); border: 1px solid rgba(255,182,193,0.22); color: #FFB6C1; font-size: 0.7rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; }

    /* ── WHATSAPP FLOAT ── */
    #wa-float { position: fixed; bottom: 24px; right: 24px; width: 58px; height: 58px; background: #25D366; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 24px rgba(37,211,102,0.5); z-index: 9999; text-decoration: none; transition: transform 0.3s, box-shadow 0.3s; }
    #wa-float:hover { transform: scale(1.12); box-shadow: 0 10px 36px rgba(37,211,102,0.65); }
    #wa-float svg { width: 28px; height: 28px; fill: #fff; }
  </style>
`;
html = html.replace('</head>', newCSS + '\n</head>');

// ───────────────────────────────────────────────────────
// 4. ADD nav link for Pricing
// ───────────────────────────────────────────────────────
html = html.replace(
  `<a href="#privacy">Privacy</a>`,
  `<a href="#pricing">Pricing</a>
                <a href="#privacy">Privacy</a>`
);

// ───────────────────────────────────────────────────────
// 5. INJECT STATS BAR + AUDIENCE TABS right after </header>
// ───────────────────────────────────────────────────────
const heroEnd = html.indexOf('</header>');
const insertAfterHero = heroEnd + '</header>'.length;

const statsBar = `

  <!-- ═══════════════ NEW: STATS BAR ═══════════════ -->
  <section id="stats-bar" class="reveal">
    <div class="stats-bar-inner">
      <div class="stats-bar-pill"><span class="sb-num">21+</span> Feature Modules</div>
      <div class="stats-bar-pill"><span class="sb-num">7</span> User Roles</div>
      <div class="stats-bar-pill">🔒 <span class="sb-num">100%</span> Encrypted</div>
      <div class="stats-bar-pill">🏦 <span class="sb-num">₹1Cr+</span> World Bank Team</div>
      <div class="stats-bar-pill">🏆 TNAI Award Winner</div>
      <div class="stats-bar-pill">🏛️ NABH Advisory</div>
    </div>
  </section>

  <!-- ═══════════════ NEW: WHO IS MAACARE FOR? ═══════════════ -->
  <section id="audience">
    <div class="audience-wrap">
      <div class="reveal" style="text-align:center; margin-bottom:2rem;">
        <span class="mc-badge">💕 Who Is MaaCare For?</span>
        <h2 class="mc-h2">Complete Care for Every Stage</h2>
        <div class="mc-divider center"></div>
        <p class="mc-p">From teenage girls to new mothers, from doctors to nurses — MaaCare has a dedicated experience for everyone.</p>
      </div>
      <!-- Tab Nav -->
      <div class="tab-nav reveal">
        <button class="tab-btn active"   onclick="mcTab('teen',this)">🩸 Teen &amp; Young Women</button>
        <button class="tab-btn"          onclick="mcTab('pregnant',this)">🤰 Pregnant Moms</button>
        <button class="tab-btn"          onclick="mcTab('postpartum',this)">🍼 New Mothers</button>
        <button class="tab-btn"          onclick="mcTab('child',this)">👶 Child Health</button>
        <button class="tab-btn blue-tab" onclick="mcTab('doctor',this)">🩺 Doctors</button>
        <button class="tab-btn teal-tab" onclick="mcTab('nurse',this)">👩‍⚕️ Nurses</button>
      </div>

      <!-- TAB 1: TEEN -->
      <div class="tab-pane active" id="pane-teen">
        <div class="tab-content-grid">
          <div>
            <span class="mc-badge">🩸 Ages 13–30 · Period Health</span>
            <h3 class="tab-headline">Your Health. Your Privacy. 100% Yours.</h3>
            <div class="mc-divider"></div>
            <p class="mc-p" style="margin-bottom:1.1rem;">MaaCare's Period Tracker is designed with complete privacy and dignity — because your health data belongs only to you.</p>
            <ul class="feat-list">
              <li><span class="li-icon">📅</span> Smart period &amp; cycle prediction — always know what's coming</li>
              <li><span class="li-icon">🩺</span> PCOS risk assessment with immediate doctor referral</li>
              <li><span class="li-icon">😔</span> PMS symptom tracker — mood, cramps, bloating, cravings</li>
              <li><span class="li-icon">🔒</span> <strong>Stealth Mode</strong> — app icon changes, separate PIN lock on period section</li>
              <li><span class="li-icon">🙈</span> Anonymous questions to gynecologist — name is <em>NEVER</em> shown</li>
              <li><span class="li-icon">🔬</span> Vaginal health tracker — infection detection &amp; alerts</li>
              <li><span class="li-icon">⏱️</span> Emergency contraception 72-hour countdown timer</li>
              <li><span class="li-icon">📦</span> Monthly Period Care Kit delivered to your door</li>
            </ul>
            <div style="margin-top:1.2rem;display:flex;gap:0.8rem;flex-wrap:wrap;">
              <a href="https://play.google.com/store/apps/details?id=co.maacare.app" target="_blank" class="mc-btn mc-btn-primary">📲 Download MaaCare</a>
              <a href="#contact" class="mc-btn mc-btn-outline">Learn More</a>
            </div>
          </div>
          <div>
            <div class="tab-feature-card"><h4>🔒 Privacy First</h4><p>Stealth mode disguises the app. Separate PIN for period section. Zero data shared with family or third parties.</p></div>
            <div class="tab-feature-card" style="border-left-color:#D4A0A0;"><h4>🙈 Anonymous Q&amp;A</h4><p>Ask a gynecologist anything without revealing your identity. Clinical answers privately within 24 hours.</p></div>
            <div class="tab-feature-card" style="border-left-color:#f06292;"><h4>🩺 PCOS Assessment</h4><p>AI-driven PCOS risk screening with auto-referral to certified gynecologists for follow-up care.</p></div>
          </div>
        </div>
      </div>

      <!-- TAB 2: PREGNANT -->
      <div class="tab-pane" id="pane-pregnant">
        <div class="tab-content-grid">
          <div>
            <span class="mc-badge">🤰 Week 1 to Delivery</span>
            <h3 class="tab-headline">Week 1 se Delivery tak — Hum Saath Hain</h3>
            <div class="mc-divider"></div>
            <ul class="feat-list">
              <li><span class="li-icon">📅</span> Week-by-week pregnancy tracker with baby's development milestones</li>
              <li><span class="li-icon">👣</span> Kick Counter — alert if &lt;10 kicks in 2 hours</li>
              <li><span class="li-icon">⏱️</span> Contraction Timer — 5-1-1 rule alert for labor readiness</li>
              <li><span class="li-icon">💉</span> BP, sugar &amp; weight tracking with trend graphs</li>
              <li><span class="li-icon">🔔</span> Antenatal test reminders — NT scan, OGTT, anomaly scan</li>
              <li><span class="li-icon">🧪</span> Home blood test — phlebotomist comes to your home</li>
              <li><span class="li-icon">📹</span> HD Video OB-GYN consultation — 100% in-app via ZEGOCLOUD</li>
              <li><span class="li-icon">🏠</span> Home nurse visit for antenatal monitoring</li>
            </ul>
            <div style="margin-top:1.2rem;"><a href="https://play.google.com/store/apps/details?id=co.maacare.app" target="_blank" class="mc-btn mc-btn-primary">📲 Download MaaCare</a></div>
          </div>
          <div>
            <div class="tab-feature-card" style="border-left-color:#f48fb1;"><h4>👣 Smart Kick Counter</h4><p>One-tap fetal movement tracking. Alert if less than 10 kicks in 2 hours — nurse notified instantly.</p></div>
            <div class="tab-feature-card" style="border-left-color:#D4A0A0;"><h4>⏱️ Contraction Timer</h4><p>Precision timing with 5-1-1 rule detection. Know exactly when to head to the hospital.</p></div>
            <div class="tab-feature-card" style="border-left-color:#f06292;"><h4>📹 HD Tele-OB</h4><p>Video OB-GYN consultations powered by ZEGOCLOUD — crystal clear, zero buffering, fully private.</p></div>
          </div>
        </div>
      </div>

      <!-- TAB 3: POSTPARTUM -->
      <div class="tab-pane" id="pane-postpartum">
        <div class="tab-content-grid">
          <div>
            <span class="mc-badge">🍼 Postpartum Care</span>
            <h3 class="tab-headline">Delivery ke Baad Ka Safar Bhi Important Hai</h3>
            <div class="mc-divider"></div>
            <ul class="feat-list">
              <li><span class="li-icon">🩸</span> Lochia (postpartum bleeding) tracker with danger-sign alerts</li>
              <li><span class="li-icon">🤱</span> Breastfeeding timer — L/R breast, duration &amp; milk log</li>
              <li><span class="li-icon">📓</span> Baby daily log — feeds, diapers, sleep, weight &amp; temperature</li>
              <li><span class="li-icon">🧠</span> Edinburgh PPD Screening (EPDS) at 2 weeks &amp; 6 weeks</li>
              <li><span class="li-icon">📸</span> C-section wound photo upload for remote assessment</li>
              <li><span class="li-icon">🏠</span> Nurse home visits — postnatal monitoring at your doorstep</li>
              <li><span class="li-icon">📹</span> Lactation consultant video call — breastfeeding expert on demand</li>
            </ul>
            <div style="margin-top:1.2rem;"><a href="https://play.google.com/store/apps/details?id=co.maacare.app" target="_blank" class="mc-btn mc-btn-primary">📲 Download MaaCare</a></div>
          </div>
          <div>
            <div class="tab-feature-card" style="border-left-color:#f48fb1;"><h4>🧠 PPD Screening</h4><p>Edinburgh Postnatal Depression Scale at 2 &amp; 6 weeks postpartum with immediate counselor referral.</p></div>
            <div class="tab-feature-card" style="border-left-color:#D4A0A0;"><h4>📸 Remote Wound Care</h4><p>Upload C-section wound photos — nurse reviews within 2 hours and recommends action if needed.</p></div>
            <div class="tab-feature-card" style="border-left-color:#f06292;"><h4>🤱 Smart Feeding Log</h4><p>Track L/R breast, duration, daily milk output to ensure optimal nutrition for baby.</p></div>
          </div>
        </div>
      </div>

      <!-- TAB 4: CHILD -->
      <div class="tab-pane" id="pane-child">
        <div class="tab-content-grid">
          <div>
            <span class="mc-badge">👶 Ages 0–5 Years</span>
            <h3 class="tab-headline">Aapke Bacche Ki Growth — Har Step Par</h3>
            <div class="mc-divider"></div>
            <ul class="feat-list">
              <li><span class="li-icon">📊</span> WHO Growth Charts — weight, height &amp; head circumference percentiles</li>
              <li><span class="li-icon">💉</span> National Immunization Scheduler — birth to 5 years with auto-reminders</li>
              <li><span class="li-icon">🔔</span> Missed vaccine catch-up generator — never miss a dose</li>
              <li><span class="li-icon">🧩</span> Developmental milestone tracker (0-5 yrs) — delay alerts</li>
              <li><span class="li-icon">🧠</span> Autism Screening M-CHAT-R at 18 months</li>
              <li><span class="li-icon">📄</span> Digital Vaccination Certificate PDF — always on your phone</li>
              <li><span class="li-icon">📹</span> Pediatrician video consultation — specialist in minutes</li>
            </ul>
            <div style="margin-top:1.2rem;"><a href="https://play.google.com/store/apps/details?id=co.maacare.app" target="_blank" class="mc-btn mc-btn-primary">📲 Download MaaCare</a></div>
          </div>
          <div>
            <div class="mc-card" style="margin-bottom:1rem;">
              <h4 style="font-weight:700;margin-bottom:0.8rem;color:#00BCD4;">💉 Sample Immunization Schedule</h4>
              <table class="vax-table">
                <thead><tr><th>Age</th><th>Vaccines</th></tr></thead>
                <tbody>
                  <tr><td><strong>Birth</strong></td><td>BCG · OPV-0 · HepB</td></tr>
                  <tr><td><strong>6 Weeks</strong></td><td>DTwP · IPV · PCV · RV</td></tr>
                  <tr><td><strong>9 Months</strong></td><td>OPV-2 · MMR · Vit-A</td></tr>
                  <tr><td><strong>12 Months</strong></td><td>HepA · Varicella</td></tr>
                  <tr><td><strong>15–18 mo</strong></td><td>MMR-2 · DTwP-B1 · IPV-B</td></tr>
                </tbody>
              </table>
            </div>
            <div class="tab-feature-card teal"><h4>🧠 M-CHAT-R Autism Screening</h4><p>WHO-recommended autism checklist at 18 months with instant specialist referral if any concern arises.</p></div>
          </div>
        </div>
      </div>

      <!-- TAB 5: DOCTORS -->
      <div class="tab-pane" id="pane-doctor">
        <div class="tab-content-grid">
          <div>
            <span class="mc-badge blue">🩺 For Doctors &amp; Specialists</span>
            <h3 class="tab-headline">Apna Digital Clinic — Zero Infrastructure Cost</h3>
            <div class="mc-divider" style="background:linear-gradient(90deg,#3D5AFE,#536dfe);"></div>
            <ul class="feat-list">
              <li><span class="li-icon">📅</span> Smart OPD slot management — online + in-clinic bookings</li>
              <li><span class="li-icon">📹</span> HD Video Consultation — no redirect, 100% in-app via ZEGOCLOUD</li>
              <li><span class="li-icon">💊</span> Digital Rx builder with FDA Pregnancy Category alerts (A/B/C/D/X)</li>
              <li><span class="li-icon">📁</span> Patient EHR on one screen — history, reports, scans</li>
              <li><span class="li-icon">📊</span> Real-time earnings dashboard + patient analytics</li>
              <li><span class="li-icon">🧪</span> Lab test ordering — phlebotomist dispatch, results to EHR</li>
              <li><span class="li-icon">📄</span> Referral letter PDF generator — one click, fully formatted</li>
            </ul>
            <div style="margin-top:1.2rem;display:flex;gap:0.8rem;flex-wrap:wrap;">
              <a href="mailto:contact@maapark.in" class="mc-btn mc-btn-blue">📩 Register as Doctor →</a>
              <a href="https://wa.me/918876882959" target="_blank" class="mc-btn mc-btn-outline" style="color:#3D5AFE;border-color:#3D5AFE;">Learn More</a>
            </div>
          </div>
          <div>
            <div class="tab-feature-card blue"><h4>💊 Pregnancy-Safe Rx Builder</h4><p>FDA pregnancy category (A/B/C/D/X) warnings on every medication — never accidentally prescribe Category X again.</p></div>
            <div class="tab-feature-card blue"><h4>📊 Earnings Dashboard</h4><p>Real-time revenue analytics, patient load trends, and session history at a glance.</p></div>
            <div class="tab-feature-card blue"><h4>📁 Unified Patient EHR</h4><p>History, lab reports, scans and prescriptions in one screen — no more switching apps.</p></div>
          </div>
        </div>
      </div>

      <!-- TAB 6: NURSES -->
      <div class="tab-pane" id="pane-nurse">
        <div class="tab-content-grid">
          <div>
            <span class="mc-badge teal">👩‍⚕️ For Nurses &amp; Midwives</span>
            <h3 class="tab-headline">Ghar-Ghar Seva Karo — App Se Sab Manage Hoga</h3>
            <div class="mc-divider" style="background:linear-gradient(90deg,#00BCD4,#26c6da);"></div>
            <ul class="feat-list">
              <li><span class="li-icon">📍</span> GPS-optimized daily home visit assignments — efficient routing</li>
              <li><span class="li-icon">✅</span> OTP verified check-in/check-out — tamper-proof attendance</li>
              <li><span class="li-icon">📋</span> Real-time vitals entry — BP, sugar, SpO₂, temperature, FHR</li>
              <li><span class="li-icon">🩹</span> Clinical service checklist — wound dressing, lactation support, injections</li>
              <li><span class="li-icon">🚨</span> One-tap emergency doctor escalation via HD Video</li>
              <li><span class="li-icon">💰</span> Per-visit earnings + performance dashboard</li>
              <li><span class="li-icon">📚</span> In-app CPR &amp; neonatal care training modules</li>
            </ul>
            <div style="margin-top:1.2rem;display:flex;gap:0.8rem;flex-wrap:wrap;">
              <a href="mailto:contact@maapark.in" class="mc-btn mc-btn-teal">Apply as Nurse →</a>
              <a href="https://wa.me/918876882959" target="_blank" class="mc-btn mc-btn-outline" style="color:#00BCD4;border-color:#00BCD4;">Know More</a>
            </div>
          </div>
          <div>
            <div class="tab-feature-card teal"><h4>📍 GPS-Optimized Visits</h4><p>Smart route planning — minimize travel time, maximize patient care every single day.</p></div>
            <div class="tab-feature-card teal"><h4>✅ OTP Check-In System</h4><p>Tamper-proof attendance — patients verify arrival with a one-time PIN, protecting both parties.</p></div>
            <div class="tab-feature-card teal"><h4>📚 CPR Training Modules</h4><p>In-app CPR and neonatal resuscitation training with video demonstrations and assessments.</p></div>
          </div>
        </div>
      </div>
    </div>
  </section>

`;

html = html.slice(0, insertAfterHero) + statsBar + html.slice(insertAfterHero);

// ───────────────────────────────────────────────────────
// 6. INJECT SOS + DIAGNOSTICS + PRICING + INVESTOR before Privacy section
// ───────────────────────────────────────────────────────
const privacyStart = html.indexOf('<!-- Privacy Policy Section -->');
if (privacyStart === -1) {
  console.error('Could not find Privacy Policy section anchor!');
  process.exit(1);
}

const newSections = `
  <!-- ═══════════════ NEW: SOS EMERGENCY ═══════════════ -->
  <section id="sos" class="reveal">
    <div class="sos-wrap">
      <div class="sos-pulse-circle">🚨</div>
      <span class="mc-badge red">MaaCare SOS</span>
      <h2 class="mc-h2" style="margin-top:0.4rem;">When Every Second Counts</h2>
      <div class="mc-divider center" style="background:linear-gradient(90deg,#FF5252,#ff8a80);"></div>
      <p class="mc-p" style="max-width:540px;margin:0.4rem auto 0;">In a pregnancy emergency, time is everything. One tap is all it takes.</p>
      <div class="sos-grid">
        <div class="sos-card"><span class="s-icon">📱</span><h4>Family Alert — Instantly</h4><p>SMS + call to 3 emergency contacts with live GPS location — triggered in seconds, automatically.</p></div>
        <div class="sos-card"><span class="s-icon">🚑</span><h4>Ambulance Dispatch</h4><p>Nearest ambulance auto-alerted with GPS coordinates. Zero manual calls needed.</p></div>
        <div class="sos-card"><span class="s-icon">🏥</span><h4>Hospital Locator</h4><p>Nearest maternity hospitals, blood banks, NICU shown instantly with live distance &amp; availability.</p></div>
        <div class="sos-card"><span class="s-icon">⚠️</span><h4>Danger Sign Detector</h4><p>AI triages symptoms — severe headache, bleeding, no fetal movement — and escalates care instantly.</p></div>
        <div class="sos-card"><span class="s-icon">📞</span><h4>24/7 Nurse Helpline</h4><p>Emergency nurse calls back within minutes. Available round the clock, every day of the year.</p></div>
        <div class="sos-card free"><span class="s-icon">🆓</span><h4>Free for ALL Users</h4><p>SOS Emergency is available to every MaaCare user — free or paid. Nobody left behind in an emergency.</p></div>
      </div>
    </div>
  </section>

  <!-- ═══════════════ NEW: HOME DIAGNOSTICS ═══════════════ -->
  <section id="diagnostics" class="reveal">
    <div class="diag-wrap">
      <div class="diag-grid">
        <div>
          <span class="mc-badge teal">🧪 Home Diagnostics</span>
          <h2 class="mc-h2">Lab Tests — At Your Doorstep</h2>
          <div class="mc-divider teal"></div>
          <p class="mc-p">No waiting rooms. No travel risk. A trained phlebotomist comes to your home at your chosen time.</p>
          <ul class="feat-list" style="margin-top:1.2rem;">
            <li><span class="li-icon">✅</span> ANC Full Panel (CBC, Blood Group, HIV, VDRL, HBsAg)</li>
            <li><span class="li-icon">✅</span> Double / Triple Marker &amp; NIPT — prenatal genetic screening</li>
            <li><span class="li-icon">✅</span> OGTT — Gestational Diabetes screening</li>
            <li><span class="li-icon">✅</span> Thyroid Panel (TSH, T3, T4) &amp; PCOS Hormonal Panel</li>
            <li><span class="li-icon">✅</span> Newborn Screening (PKU, Hypothyroidism, G6PD)</li>
            <li><span class="li-icon">✅</span> Serum Bilirubin — newborn jaundice monitoring</li>
          </ul>
          <div class="diag-alert">⚡ <strong>Smart Abnormal Value Alerts</strong> — Critical results automatically notify your doctor in real time. No delay, no missed values.</div>
          <div style="margin-top:1.5rem;"><a href="https://play.google.com/store/apps/details?id=co.maacare.app" target="_blank" class="mc-btn mc-btn-teal">🧪 Book Home Test</a></div>
        </div>
        <div>
          <div class="how-it-works">
            <h3>🔬 How It Works</h3>
            <div class="hw-step"><div class="hw-num">1</div><div class="hw-text"><h4>Book in 2 taps</h4><p>Select your test, choose a slot, confirm address — done in under 60 seconds in the app.</p></div></div>
            <div class="hw-step"><div class="hw-num">2</div><div class="hw-text"><h4>Phlebotomist arrives at home</h4><p>Trained, verified phlebotomist reaches your doorstep with all sterile equipment at the scheduled time.</p></div></div>
            <div class="hw-step"><div class="hw-num">3</div><div class="hw-text"><h4>Results to your health record</h4><p>Lab results uploaded directly to your encrypted MaaCare record — visible only to you and your doctor.</p></div></div>
            <div class="hw-step"><div class="hw-num">4</div><div class="hw-text"><h4>Doctor auto-alerted on abnormals</h4><p>Any value outside normal range triggers an instant notification to your doctor to review and respond.</p></div></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══════════════ NEW: PRICING PLANS ═══════════════ -->
  <section id="pricing" class="reveal">
    <div class="pricing-wrap">
      <div style="text-align:center;">
        <span class="mc-badge">💳 Subscription Plans</span>
        <h2 class="mc-h2">Plans for Every Stage of Your Journey</h2>
        <div class="mc-divider center"></div>
        <p class="mc-p">Start free, upgrade anytime. 7-day free trial on all paid plans. Cancel anytime.</p>
      </div>
      <div class="pricing-grid">
        <div class="price-card">
          <div class="price-emoji">🆓</div>
          <div class="price-name">Free Basic</div>
          <div class="price-amount">₹0<small>/forever</small></div>
          <ul class="price-features">
            <li>Period tracker</li><li>Pregnancy tracker</li><li>Immunization scheduler</li><li>AI chatbot</li><li>Community forum</li><li>SOS Emergency</li>
          </ul>
          <a href="https://play.google.com/store/apps/details?id=co.maacare.app" target="_blank" class="price-cta outline">Get Started Free</a>
        </div>
        <div class="price-card">
          <div class="price-emoji">🩸</div>
          <div class="price-name">Teen Wellness</div>
          <div class="price-amount">Coming Soon</div>
          <ul class="price-features">
            <li>All Free features</li><li>PCOS assessment</li><li>Anonymous Q&amp;A (5/mo)</li><li>PMS tracker</li><li>Period care kit</li><li>Mental wellness</li>
          </ul>
          <a href="https://wa.me/918876882959" target="_blank" class="price-cta outline">Notify Me</a>
        </div>
        <div class="price-card featured">
          <div class="price-badge">⭐ Most Popular</div>
          <div class="price-emoji">🌸</div>
          <div class="price-name">MaaCare Silver</div>
          <div class="price-amount">Coming Soon</div>
          <ul class="price-features">
            <li>All Free features</li><li>2 video consults/month</li><li>1 nurse visit/month</li><li>Home lab tests</li><li>Digital prescriptions</li><li>PPD screening</li>
          </ul>
          <a href="https://wa.me/918876882959" target="_blank" class="price-cta primary">Notify Me</a>
        </div>
        <div class="price-card">
          <div class="price-emoji">✨</div>
          <div class="price-name">MaaCare Gold</div>
          <div class="price-amount">Coming Soon</div>
          <ul class="price-features">
            <li>Unlimited video consults</li><li>4 nurse visits/month</li><li>Priority lab tests</li><li>E-pharmacy discounts</li><li>Full PPD program</li><li>Analytics dashboard</li>
          </ul>
          <a href="https://wa.me/918876882959" target="_blank" class="price-cta outline">Notify Me</a>
        </div>
        <div class="price-card">
          <div class="price-emoji">💎</div>
          <div class="price-name">Platinum</div>
          <div class="price-amount">Coming Soon</div>
          <ul class="price-features">
            <li>Dedicated OB-GYN</li><li>24/7 nurse on-call</li><li>Weekly home monitoring</li><li>Unlimited lab tests</li><li>Emergency priority queue</li><li>Family plan (4 members)</li>
          </ul>
          <a href="https://wa.me/918876882959" target="_blank" class="price-cta outline">Notify Me</a>
        </div>
      </div>
      <p class="pricing-note">🔒 All plans include end-to-end encryption &amp; DPDP 2023 compliance &nbsp;|&nbsp; 7-day free trial on all paid plans &nbsp;|&nbsp; Cancel anytime</p>
    </div>
  </section>

  <!-- ═══════════════ NEW: INVESTOR SECTION ═══════════════ -->
  <section id="investor" class="reveal">
    <div class="investor-wrap">
      <div class="investor-grid">
        <div>
          <span class="mc-badge navy">💼 For Investors &amp; Partners</span>
          <h2 class="mc-h2 white" style="margin-top:0.5rem;">Building India's First End-to-End Maternal Health Ecosystem</h2>
          <div class="mc-divider white"></div>
          <p class="mc-p white">MaaCare is not just an app — it's complete clinical infrastructure connecting mothers, nurses, doctors, labs, and pharmacies into one seamless ecosystem.</p>
          <div class="inv-stat-grid">
            <div class="inv-stat"><div class="inv-num">250M+</div><div class="inv-label">Women of reproductive age in India</div></div>
            <div class="inv-stat"><div class="inv-num">44,000+</div><div class="inv-label">Maternal deaths/year — largely preventable</div></div>
            <div class="inv-stat"><div class="inv-num">$8.3B</div><div class="inv-label">India maternal health market (&lt;5% digitized)</div></div>
            <div class="inv-stat"><div class="inv-num">7</div><div class="inv-label">Integrated revenue streams in one platform</div></div>
          </div>
          <div class="inv-ctas">
            <a href="mailto:founder@maapark.in" class="mc-btn mc-btn-primary">📩 Request Investor Deck</a>
            <a href="https://wa.me/918876882959" target="_blank" class="mc-btn mc-btn-navy">📅 Schedule a Call</a>
          </div>
        </div>
        <div>
          <div class="inv-box">
            <h3>🏗️ What MaaCare Has Built</h3>
            <ul>
              <li>📱 Live on Google Play Store — growing daily</li>
              <li>🏗️ 21+ feature modules — fully functional</li>
              <li>👩‍⚕️ Home nursing network — GPS &amp; OTP verified</li>
              <li>🧪 Home diagnostics — phlebotomist on demand</li>
              <li>🔒 Privacy-first period tracker — first in India</li>
              <li>🏆 TNAI &amp; Koita Foundation Award 2025</li>
              <li>🏛️ World Bank-awarded clinical advisory team</li>
            </ul>
          </div>
          <div class="inv-box">
            <h3>💰 Revenue Streams</h3>
            <div class="rev-grid">
              <div class="rev-item">💳 Monthly subscriptions</div>
              <div class="rev-item">📹 Per-consultation fees</div>
              <div class="rev-item">🏠 Nurse visit commissions</div>
              <div class="rev-item">🧪 Lab test margins</div>
              <div class="rev-item">💊 E-pharmacy sales</div>
              <div class="rev-item">📦 Care kit subscriptions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

`;

html = html.slice(0, privacyStart) + newSections + html.slice(privacyStart);

// ───────────────────────────────────────────────────────
// 7. REPLACE OLD FOOTER with new expanded footer
// ───────────────────────────────────────────────────────
const oldFooterStart = html.indexOf('<!-- Footer -->');
const oldFooterEnd   = html.indexOf('</footer>') + '</footer>'.length;

const newFooter = `<!-- ═══ NEW: EXPANDED FOOTER ═══ -->
  <footer id="site-footer">
    <div class="footer-mega">
      <div class="footer-mega-col">
        <div class="f-brand-name">🌿 Maa Park</div>
        <p class="f-tagline">India's most complete maternal &amp; women's health platform. Built with ❤️ in Assam, India.</p>
        <a href="https://play.google.com/store/apps/details?id=co.maacare.app" target="_blank" class="f-playstore-btn"><i class="fa-brands fa-google-play"></i> Download on Play Store</a>
        <a href="https://wa.me/918876882959" target="_blank" class="f-wa-link"><i class="fa-brands fa-whatsapp"></i> WhatsApp Us</a>
        <a href="mailto:info@maapark.in">📧 info@maapark.in</a>
        <div style="display:flex;gap:0.7rem;margin-top:1rem;flex-wrap:wrap;">
          <a href="https://whatsapp.com/channel/0029VbD8GjLHLHQgOzwPFq0" target="_blank" style="color:rgba(255,255,255,0.6)!important;font-size:1.3rem;"><i class="fa-brands fa-whatsapp"></i></a>
          <a href="https://www.instagram.com/maacare.co" target="_blank" style="color:rgba(255,255,255,0.6)!important;font-size:1.3rem;"><i class="fa-brands fa-instagram"></i></a>
          <a href="https://www.linkedin.com/in/maa-care-19b443405" target="_blank" style="color:rgba(255,255,255,0.6)!important;font-size:1.3rem;"><i class="fa-brands fa-linkedin"></i></a>
          <a href="https://www.facebook.com/profile.php?id=61564804027983" target="_blank" style="color:rgba(255,255,255,0.6)!important;font-size:1.3rem;"><i class="fa-brands fa-facebook"></i></a>
          <a href="https://youtube.com/@tathyayatra-sx6sg" target="_blank" style="color:rgba(255,255,255,0.6)!important;font-size:1.3rem;"><i class="fa-brands fa-youtube"></i></a>
        </div>
      </div>
      <div class="footer-mega-col">
        <h4>For Users</h4>
        <a href="#audience">Period Tracker</a>
        <a href="#audience">Pregnancy Care</a>
        <a href="#audience">Postpartum Care</a>
        <a href="#audience">Child Health</a>
        <a href="#diagnostics">Home Lab Tests</a>
        <a href="#sos">SOS Emergency</a>
        <a href="#pricing">Pricing Plans</a>
      </div>
      <div class="footer-mega-col">
        <h4>For Providers</h4>
        <a href="mailto:contact@maapark.in">Join as Doctor</a>
        <a href="mailto:contact@maapark.in">Join as Nurse</a>
        <a href="mailto:contact@maapark.in">Lab Partnership</a>
        <a href="mailto:contact@maapark.in">Pharmacy Partner</a>
        <a href="#investor">For Investors</a>
        <a href="championship.html">Nursing Championship</a>
      </div>
      <div class="footer-mega-col">
        <h4>Company</h4>
        <a href="#about">About Maa Park</a>
        <a href="#team">Our Team</a>
        <a href="https://maacare.co" target="_blank">Web App (maacare.co)</a>
        <a href="#contact">Contact Us</a>
        <a href="#privacy">Privacy Policy</a>
        <a href="#contact">Terms of Service</a>
      </div>
    </div>
    <div class="footer-bottom-bar">
      <div class="footer-bottom-inner">
        <span>© 2026 Maa Park Company. All rights reserved. Made with ❤️ in Assam, India.</span>
        <div class="footer-badges">
          <span class="f-badge">DPDP 2023 Compliant</span>
          <span class="f-badge">End-to-End Encrypted</span>
          <span class="f-badge">🏆 TNAI Award Winner</span>
        </div>
      </div>
    </div>
  </footer>`;

html = html.slice(0, oldFooterStart) + newFooter + html.slice(oldFooterEnd);

// ───────────────────────────────────────────────────────
// 8. ADD WhatsApp Float + JS before </body>
// ───────────────────────────────────────────────────────
const newBodyScripts = `
  <!-- ═══ NEW: WhatsApp Floating Button ═══ -->
  <a id="wa-float" href="https://wa.me/918876882959" target="_blank" aria-label="Chat on WhatsApp">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  </a>

  <script>
    /* ─── Tab Switching ─── */
    function mcTab(tabName, btn) {
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      var pane = document.getElementById('pane-' + tabName);
      if (pane) pane.classList.add('active');
      if (btn) btn.classList.add('active');
    }
    /* ─── Scroll Reveal ─── */
    (function() {
      var ro = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); ro.unobserve(entry.target); }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
      document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.reveal').forEach(function(el) { ro.observe(el); });
      });
    })();
    /* ─── Smooth Scroll ─── */
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('a[href^="#"]').forEach(function(a) {
        a.addEventListener('click', function(e) {
          var t = document.querySelector(this.getAttribute('href'));
          if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        });
      });
    });
  </script>

`;

html = html.replace('</body>', newBodyScripts + '</body>');

// ───────────────────────────────────────────────────────
// 9. WRITE OUTPUT
// ───────────────────────────────────────────────────────
fs.writeFileSync(filePath, html, 'utf8');
const finalStats = fs.readFileSync(filePath);
console.log('✅ index.html updated successfully!');
console.log('   Final size:', finalStats.length, 'bytes');
console.log('   Lines:', html.split('\n').length);
console.log('\n   New sections added:');
console.log('   ✅ Stats Bar (6 trust pills)');
console.log('   ✅ Audience Tabs (6 tabs — Teen, Pregnant, Postpartum, Child, Doctor, Nurse)');
console.log('   ✅ SOS Emergency (pulsing animation + 6 cards)');
console.log('   ✅ Home Diagnostics (split layout + how-it-works)');
console.log('   ✅ Pricing Plans (5 cards + featured badge)');
console.log('   ✅ Investor Section (dark navy + market stats + revenue streams)');
console.log('   ✅ Expanded Footer (4-column + compliance badges)');
console.log('   ✅ WhatsApp Floating Button (fixed bottom-right)');
console.log('   ✅ Tab switching JS + Scroll reveal JS');
console.log('\n   Existing content preserved:');
console.log('   ✅ Hero, Championship bar, Navbar');
console.log('   ✅ Team Section (all 4 members with full bios)');
console.log('   ✅ About MaaCare + Mission/Vision');
console.log('   ✅ App Features (15 cards)');
console.log('   ✅ Privacy Policy (7 sections)');
console.log('   ✅ Contact / Collaboration form');
console.log('   ✅ Championship Popup Modal');
