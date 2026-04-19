<script>
  import { onMount } from 'svelte'

  let { onNavigate = null } = $props()

  let savedIds  = $state([])
  let sessions  = $state([])
  let loading   = $state(true)
  let error     = $state(null)

  const API_KEY    = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

  const days       = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const CAT_COLOR = {
    'Quran Studies': '#4ADE80', 'Hadith Explanations': '#60A5FA',
    'Islamic Law': '#A78BFA',   'Spirituality': '#F59E0B',
    'Language': '#F472B6',      'General': '#94A3B8',
  }
  function catColor(cat) { return CAT_COLOR[cat] || CAT_COLOR['General'] }

  async function fetchSavedSessions() {
    try {
      loading = true
      const saved = localStorage.getItem('savedSessions')
      savedIds = saved ? JSON.parse(saved) : []
      if (savedIds.length === 0) { sessions = []; loading = false; return }
      const response = await fetch(`${SUPABASE_URL}/rest/v1/halqahs?status=eq.published`, {
        headers: { 'apikey': API_KEY, 'Authorization': 'Bearer ' + API_KEY },
      })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      const all = await response.json()
      sessions = all.filter(s => savedIds.includes(s.id))
    } catch (e) { error = e.message }
    finally { loading = false }
  }

  function removeSession(id) {
    savedIds  = savedIds.filter(sid => sid !== id)
    sessions  = sessions.filter(s => s.id !== id)
    localStorage.setItem('savedSessions', JSON.stringify(savedIds))
  }

  function getCategoryName(cat) {
    if (!cat) return 'General'
    try { return JSON.parse(cat).name || 'General' } catch { return 'General' }
  }

  function getDays(sched) {
    if (!sched?.recurring?.days) return ''
    return sched.recurring.days.map(d => days[d]).join(' · ')
  }

  function getTime(sched) {
    if (!sched?.recurring) return ''
    return sched.recurring.start_time + ' – ' + sched.recurring.end_time
  }

  function getPlatformLabel(platform) {
    const map = { telegram: 'Telegram', youtube: 'YouTube', facebook: 'Facebook', zoom: 'Zoom', meet: 'Meet' }
    return map[platform?.toLowerCase()] || platform
  }

  onMount(() => { fetchSavedSessions() })
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
    <div style="width:38px"></div><!-- spacer to balance brand -->
  </nav>

  <!-- ── HERO ── -->
  <header class="hero">
    <h1 class="hero-title">My <em>Sessions</em></h1>
    <p class="hero-sub">Your saved knowledge circles</p>
  </header>

  <!-- ── CONTENT ── -->
  <main class="content">
    {#if loading}
      <div class="cards">
        {#each {length: 4} as _, i}
          <div class="card skeleton" style="--delay:{i * 80}ms">
            <div class="skel skel-tag"></div>
            <div class="skel skel-title"></div>
            <div class="skel skel-sub"></div>
            <div class="skel skel-meta"></div>
          </div>
        {/each}
      </div>

    {:else if error}
      <div class="empty-state">
        <p class="empty-icon">⚠</p>
        <p class="empty-label">{error}</p>
        <button class="cta-btn" onclick={fetchSavedSessions}>Try again</button>
      </div>

    {:else if sessions.length === 0}
      <div class="empty-state">
        <div class="empty-ornament" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M44 8H20a4 4 0 00-4 4v40l16-10 16 10V12a4 4 0 00-4-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3 class="empty-title">Nothing saved yet</h3>
        <p class="empty-label">Save sessions from the Discover page to see them here</p>
        <a href="/" class="cta-btn">Discover Sessions →</a>
      </div>

    {:else}
      <p class="count-meta">{sessions.length} saved {sessions.length === 1 ? 'session' : 'sessions'}</p>
      <div class="cards">
        {#each sessions as halqah, i}
          {@const cat   = getCategoryName(halqah.category)}
          {@const color = catColor(cat)}
          <div
            class="card"
            style="--cat:{color}; --delay:{Math.min(i,8)*45}ms"
          >
            <button
              class="remove-btn"
              onclick={() => removeSession(halqah.id)}
              aria-label="Remove session"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>

            <div class="card-top">
              <span class="cat-tag" style="--cat:{color}">{cat}</span>
            </div>

            <h3 class="card-title">{halqah.title}</h3>
            {#if halqah.lecturer}
              <p class="card-lecturer">{halqah.lecturer}</p>
            {/if}

            <div class="card-meta">
              {#if getDays(halqah.schedule)}
                <span class="meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  {getDays(halqah.schedule)}
                </span>
              {/if}
              {#if getTime(halqah.schedule)}
                <span class="meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  {getTime(halqah.schedule)}
                </span>
              {/if}
              {#if halqah.language}
                <span class="meta-chip lang">{halqah.language}</span>
              {/if}
            </div>

            {#if halqah.schedule?.onlineLinks?.length}
              <div class="links-row">
                {#each halqah.schedule.onlineLinks.slice(0, 3) as link}
                  <a href={link.link} target="_blank" rel="noopener noreferrer" class="link-pill">
                    {getPlatformLabel(link.platform)} →
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </main>

  <!-- ── BOTTOM NAV ── -->
  <nav class="bottom-nav" aria-label="Main navigation">
    <a href="/" class="bnav-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <span>Discover</span>
    </a>
    <a href="/mysessions.html" class="bnav-item active" aria-current="page">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
      </svg>
      <span>Saved</span>
      {#if sessions.length > 0}
        <span class="bnav-pip"></span>
      {/if}
    </a>
    <a href="/about.html" class="bnav-item">
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
      radial-gradient(ellipse 70% 40% at 90% 5%,  rgba(200,146,42,.06) 0%, transparent 65%),
      radial-gradient(ellipse 50% 50% at 10% 95%, rgba(75,191,173,.05) 0%, transparent 60%);
    color: var(--cream);
    font-family: 'Sora', system-ui, sans-serif;
    padding-bottom: 6rem;
    position: relative;
    overflow-x: hidden;
  }

  .bg-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
  .orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: .3; }
  .orb-gold { width: 350px; height: 280px; top: -60px; right: -80px; background: radial-gradient(circle, rgba(200,146,42,.5), transparent 70%); }
  .orb-sage { width: 300px; height: 300px; bottom: -50px; left: -60px; background: radial-gradient(circle, rgba(75,191,173,.4), transparent 70%); }

  /* ── Navbar ── */
  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: .875rem 1.25rem;
    position: sticky; top: 0; z-index: 100;
    background: rgba(7,16,28,.88);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }

  .back-btn {
    display: flex; align-items: center; justify-content: center;
    width: 38px; height: 38px;
    border-radius: 10px;
    background: var(--c06);
    border: 1px solid var(--border);
    color: var(--c60);
    cursor: pointer;
    text-decoration: none;
    transition: background .15s, color .15s;
  }
  .back-btn:hover  { background: var(--c12); color: var(--cream); }
  .back-btn svg    { width: 18px; height: 18px; }

  .brand { display: flex; align-items: center; gap: .625rem; }
  .logo  { height: 28px; width: auto; }
  .brand-name {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 1.1rem; font-weight: 500; letter-spacing: -.02em;
  }

  /* ── Hero ── */
  .hero { padding: 2rem 1.25rem 1.25rem; position: relative; }
  .hero::after {
    content: '';
    display: block;
    width: 40px; height: 2px;
    background: linear-gradient(90deg, var(--gold), transparent);
    border-radius: 2px; margin-top: 1rem;
  }
  .hero-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: clamp(2rem, 8vw, 2.75rem);
    font-weight: 500;
    line-height: 1.1; letter-spacing: -.03em; margin-bottom: .4rem;
  }
  .hero-title em { font-style: italic; color: var(--gold-lt); }
  .hero-sub { font-size: .88rem; color: var(--c60); }

  /* ── Content ── */
  .content { padding: 0 1.25rem; position: relative; z-index: 1; }

  .count-meta { font-size: .75rem; color: var(--c30); margin-bottom: .875rem; }

  /* ── Cards ── */
  .cards {
    display: flex; flex-direction: column; gap: .625rem;
  }
  @media (min-width: 640px) {
    .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: .75rem; }
  }

  .card {
    display: flex; flex-direction: column; gap: .45rem;
    background: var(--c06);
    border: 1px solid var(--border);
    border-left: 3px solid var(--cat, var(--gold));
    border-radius: var(--r);
    padding: .875rem 1rem;
    position: relative; overflow: hidden;
    animation: fadeUp .45s cubic-bezier(.22,1,.36,1) both;
    animation-delay: var(--delay, 0ms);
  }
  .card::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, var(--cat, var(--gold)), transparent 60%);
    opacity: .35;
  }

  /* ── Remove button ── */
  .remove-btn {
    position: absolute; top: .625rem; right: .625rem;
    display: flex; align-items: center; justify-content: center;
    width: 26px; height: 26px;
    border-radius: 50%;
    background: rgba(255,80,80,.12);
    border: 1px solid rgba(255,80,80,.2);
    color: rgba(255,120,120,.7);
    cursor: pointer;
    transition: all .15s;
    padding: 0;
  }
  .remove-btn svg   { width: 12px; height: 12px; }
  .remove-btn:hover { background: rgba(255,80,80,.25); color: #ff8080; }

  /* ── Card content ── */
  .card-top { display: flex; align-items: center; gap: .5rem; padding-right: 1.75rem; }

  .cat-tag {
    display: inline-flex; align-items: center;
    padding: .18rem .5rem;
    border-radius: var(--rpill);
    font-size: .62rem; font-weight: 600;
    letter-spacing: .04em; text-transform: uppercase;
    background: rgba(200,146,42,.13);
    background: color-mix(in srgb, var(--cat, var(--gold)) 13%, transparent);
    color: var(--cat, var(--gold));
  }

  .card-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: .98rem; font-weight: 500;
    line-height: 1.35; letter-spacing: -.01em;
    color: var(--cream); margin: 0;
    padding-right: 1.5rem;
  }
  .card-lecturer { font-size: .8rem; color: var(--sage); margin: 0; }

  .card-meta { display: flex; flex-wrap: wrap; gap: .35rem .6rem; }
  .meta-chip {
    display: inline-flex; align-items: center; gap: .25rem;
    font-size: .7rem; color: var(--c30);
  }
  .meta-chip svg { width: 11px; height: 11px; flex-shrink: 0; }
  .meta-chip.lang {
    background: var(--c06); border: 1px solid var(--border);
    border-radius: 4px; padding: .1rem .35rem;
    text-transform: capitalize;
  }

  .links-row { display: flex; flex-wrap: wrap; gap: .375rem; margin-top: .125rem; }
  .link-pill {
    padding: .25rem .6rem;
    background: var(--gold-dim);
    border: 1px solid rgba(200,146,42,.2);
    border-radius: var(--rpill);
    color: var(--gold);
    font-size: .7rem; font-weight: 500;
    text-decoration: none;
    transition: background .15s;
  }
  .link-pill:hover { background: rgba(200,146,42,.2); }

  /* ── Skeleton ── */
  .card.skeleton { border-left-color: var(--border); }
  .card.skeleton::after { display: none; }
  .skel {
    border-radius: 6px;
    background: linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.05) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
    animation-delay: var(--delay, 0ms);
  }
  .skel-tag   { width: 56px; height: 17px; border-radius: var(--rpill); }
  .skel-title { height: 19px; margin-top: .35rem; }
  .skel-sub   { height: 13px; width: 50%; margin-top: .3rem; }
  .skel-meta  { height: 11px; width: 70%; margin-top: .35rem; }

  /* ── Empty state ── */
  .empty-state { text-align: center; padding: 4rem 1.5rem; }
  .empty-ornament {
    width: 64px; height: 64px;
    border-radius: 20px;
    background: var(--c06);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1.25rem;
    color: var(--c30);
  }
  .empty-ornament svg { width: 32px; height: 32px; }
  .empty-title { font-family: 'Fraunces', Georgia, serif; font-size: 1.25rem; font-weight: 500; margin-bottom: .5rem; }
  .empty-icon  { font-size: 2.5rem; margin-bottom: .75rem; opacity: .45; }
  .empty-label { font-size: .875rem; color: var(--c60); margin-bottom: 1.25rem; line-height: 1.5; }
  .cta-btn {
    display: inline-block;
    padding: .625rem 1.5rem;
    background: var(--gold); border: none;
    border-radius: var(--rpill);
    color: var(--ink);
    font-family: 'Sora', system-ui, sans-serif;
    font-size: .875rem; font-weight: 600;
    cursor: pointer; text-decoration: none;
    transition: background .15s;
  }
  .cta-btn:hover { background: var(--gold-lt); }

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
    border: none; background: none; cursor: pointer;
    transition: color .2s, background .2s;
    position: relative;
  }
  .bnav-item svg { width: 19px; height: 19px; transition: transform .2s; }
  .bnav-item:hover,
  .bnav-item.active { color: var(--gold); background: var(--gold-dim); }
  .bnav-item.active svg { transform: scale(1.1); }
  .bnav-pip {
    position: absolute; top: 4px; right: 4px;
    width: 6px; height: 6px;
    border-radius: 50%; background: var(--gold);
  }

  /* ── Keyframes ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
</style>
