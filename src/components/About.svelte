<script>
  let { onNavigate = null } = $props()
</script>

<div class="app">

  <!-- Ambient orbs -->
  <div class="bg-orbs" aria-hidden="true">
    <div class="orb orb-gold"></div>
    <div class="orb orb-sage"></div>
  </div>

  <!-- ── NAV ── -->
  <nav class="navbar">
    {#if onNavigate}
      <button class="back-btn" onclick={() => onNavigate('landing')} aria-label="Go back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
    {:else}
      <a href="/" class="back-btn" aria-label="Go back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </a>
    {/if}
    <div class="brand">
      <img src="/images/Halqoh Logo.png" alt="Halqah" class="logo" />
      <span class="brand-name">Halqah</span>
    </div>
    <div style="width:38px"></div>
  </nav>

  <!-- ── CONTENT ── -->
  <main class="content">

    <!-- Header -->
    <div class="about-header">
      <div class="about-logo-ring">
        <img src="/images/Halqoh Logo.png" alt="Halqah" class="about-logo" />
      </div>
      <h1 class="about-title">Halqah Directories</h1>
      <p class="about-sub">Discover Islamic Knowledge Sessions</p>
    </div>

    <!-- Cards -->
    <div class="cards">
      <div class="about-card" style="--delay:60ms">
        <div class="about-card-icon">📖</div>
        <div>
          <h3>What is Halqah?</h3>
          <p>A curated directory of authentic Islamic knowledge sessions compiled for the Ummah. We make it easy to discover beneficial gatherings from trusted scholars — whether you're seeking Quran explanation, Hadith studies, Islamic jurisprudence, or spiritual development.</p>
        </div>
      </div>

      <div class="about-card" style="--delay:120ms">
        <div class="about-card-icon">🌙</div>
        <div>
          <h3>Our Mission</h3>
          <p>We ask Allah to accept this effort as <strong>ibadah</strong> (worship) and a means of drawing closer to Him and His Messenger ﷺ. This is a free service with no ads, no subscriptions — only sincerity for the Ummah.</p>
        </div>
      </div>

      <div class="about-card" style="--delay:180ms">
        <div class="about-card-icon">✉️</div>
        <div>
          <h3>Get Involved</h3>
          <p>Know of a beneficial session that should be listed here? We'd love to hear about it. Reach out and we'll consider adding it to the directory.</p>
          <a href="mailto:abooubaydah01@gmail.com" class="contact-btn">Contact Us →</a>
        </div>
      </div>
    </div>

    <div class="about-footer">
      <p>Made with care for the Ummah</p>
      <p class="dua">May Allah grant us Jannah</p>
    </div>

  </main>

  <!-- ── BOTTOM NAV ── -->
  <nav class="bottom-nav" aria-label="Main navigation">
    <a href="/" class="bnav-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <span>Discover</span>
    </a>
    <a href="/mysessions.html" class="bnav-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
      </svg>
      <span>Saved</span>
    </a>
    <a href="/about.html" class="bnav-item active" aria-current="page">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
      </svg>
      <span>About</span>
    </a>
  </nav>

</div>

<style>
  :root {
    --ink:     #07101C;
    --ink-1:   #0C1827;
    --gold:    #C8922A;
    --gold-lt: #E0B860;
    --gold-dim:rgba(200,146,42,.12);
    --sage:    #4BBFAD;
    --cream:   #EDE5D8;
    --c60:     rgba(237,229,216,.60);
    --c30:     rgba(237,229,216,.30);
    --c12:     rgba(237,229,216,.12);
    --c06:     rgba(237,229,216,.06);
    --border:  rgba(237,229,216,.08);
    --bmd:     rgba(237,229,216,.14);
    --r:       14px;
    --rpill:   100px;
  }

  .app {
    min-height: 100vh;
    background: var(--ink);
    background-image:
      radial-gradient(ellipse 60% 40% at 80% 5%,  rgba(200,146,42,.07) 0%, transparent 65%),
      radial-gradient(ellipse 50% 50% at 20% 95%, rgba(75,191,173,.05) 0%, transparent 60%);
    color: var(--cream);
    font-family: 'Sora', system-ui, sans-serif;
    padding-bottom: 6rem;
    position: relative;
    overflow-x: hidden;
  }

  .bg-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
  .orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: .3; }
  .orb-gold { width: 350px; height: 280px; top: -60px; right: -60px; background: radial-gradient(circle, rgba(200,146,42,.5), transparent 70%); }
  .orb-sage { width: 300px; height: 300px; bottom: -50px; left: -60px; background: radial-gradient(circle, rgba(75,191,173,.4), transparent 70%); }

  /* ── Navbar ── */
  .navbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: .875rem 1.25rem;
    position: sticky; top: 0; z-index: 100;
    background: rgba(7,16,28,.88);
    -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }

  .back-btn {
    display: flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--c06); border: 1px solid var(--border);
    color: var(--c60); cursor: pointer; text-decoration: none;
    transition: background .15s, color .15s;
  }
  .back-btn:hover { background: var(--c12); color: var(--cream); }
  .back-btn svg { width: 18px; height: 18px; }

  .brand { display: flex; align-items: center; gap: .625rem; }
  .logo  { height: 28px; width: auto; }
  .brand-name {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 1.1rem; font-weight: 500; letter-spacing: -.02em;
  }

  /* ── Content ── */
  .content {
    padding: 0 1.25rem;
    max-width: 600px;
    margin: 0 auto;
    position: relative; z-index: 1;
  }

  /* ── About header ── */
  .about-header {
    padding: 2.5rem 0 2rem;
    text-align: center;
    position: relative;
  }
  .about-header::after {
    content: '';
    display: block;
    width: 40px; height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    border-radius: 2px;
    margin: 1.5rem auto 0;
  }

  .about-logo-ring {
    width: 80px; height: 80px;
    border-radius: 24px;
    background: #fff;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1.25rem;
    box-shadow: 0 4px 32px rgba(0,0,0,.3), 0 0 0 1px rgba(200,146,42,.15);
  }
  .about-logo { width: 60px; height: 60px; object-fit: contain; border-radius: 18px; }

  .about-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: clamp(1.75rem, 6vw, 2.25rem);
    font-weight: 500;
    letter-spacing: -.03em;
    margin-bottom: .4rem;
  }
  .about-sub { font-size: .9rem; color: var(--c60); }

  /* ── Cards ── */
  .cards { display: flex; flex-direction: column; gap: .75rem; }

  .about-card {
    display: flex; gap: 1rem; align-items: flex-start;
    background: var(--c06);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 1.125rem 1.125rem;
    animation: fadeUp .45s cubic-bezier(.22,1,.36,1) both;
    animation-delay: var(--delay, 0ms);
    transition: background .15s, border-color .15s;
  }
  .about-card:hover { background: var(--c12); border-color: var(--bmd); }

  .about-card-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
    width: 44px; height: 44px;
    border-radius: 12px;
    background: var(--gold-dim);
    border: 1px solid rgba(200,146,42,.15);
    display: flex; align-items: center; justify-content: center;
  }

  .about-card h3 {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 1rem; font-weight: 500;
    letter-spacing: -.01em;
    margin-bottom: .4rem; color: var(--cream);
  }
  .about-card p {
    font-size: .85rem; color: var(--c60);
    line-height: 1.65; margin: 0;
  }
  .about-card strong { color: var(--gold); font-weight: 500; }

  .contact-btn {
    display: inline-block;
    margin-top: .75rem;
    padding: .5rem 1.125rem;
    background: var(--gold);
    border-radius: var(--rpill);
    color: var(--ink);
    font-size: .82rem; font-weight: 600;
    text-decoration: none;
    transition: background .15s;
  }
  .contact-btn:hover { background: var(--gold-lt); }

  /* ── Footer ── */
  .about-footer {
    text-align: center;
    padding: 2rem 0 1rem;
    border-top: 1px solid var(--border);
    margin-top: 1.5rem;
  }
  .about-footer p { font-size: .78rem; color: var(--c30); }
  .dua { color: var(--gold); margin-top: .25rem !important; font-weight: 500; opacity: .8; }

  /* ── Bottom nav ── */
  .bottom-nav {
    display: flex;
    position: fixed; bottom: .875rem; left: 50%; transform: translateX(-50%);
    background: rgba(10,18,32,.94);
    -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
    border: 1px solid var(--bmd); border-radius: var(--rpill);
    padding: .5rem .75rem; gap: .25rem;
    box-shadow: 0 8px 40px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.04);
    z-index: 100;
  }
  .bnav-item {
    display: flex; flex-direction: column; align-items: center; gap: .18rem;
    padding: .4rem .875rem; border-radius: 40px;
    font-family: 'Sora', system-ui, sans-serif;
    font-size: .62rem; font-weight: 500;
    color: var(--c30); text-decoration: none;
    transition: color .2s, background .2s;
  }
  .bnav-item svg { width: 19px; height: 19px; transition: transform .2s; }
  .bnav-item:hover,
  .bnav-item.active { color: var(--gold); background: var(--gold-dim); }
  .bnav-item.active svg { transform: scale(1.1); }

  /* ── Keyframes ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
