<script>
  import { onMount } from 'svelte'

  let { onNavigate = null } = $props()

  let halqahs = $state([])
  let loading = $state(true)
  let loadingMore = $state(false)
  let error = $state(null)
  let currentPage = $state(1)
  let totalCount = $state(0)
  const PAGE_SIZE = 100
  let searchQuery = $state('')
  let selectedCategory = $state('All Categories')
  let selectedDay = $state('All Days')
  let selectedLanguage = $state('All Languages')
  let selectedSpeaker = $state('')
  let selectedSession = $state(null)
  let showAbout = $state(false)
  let filtersOpen = $state(false)
  let notificationsEnabled = $state(false)
  let savedSessions = $state([])
  let sessionReminders = $state({})

  const categories = ['All Categories', 'Quran Studies', 'Hadith Explanations', 'Islamic Law', 'Spirituality', 'Language']
  const dayOptions  = ['All Days', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const languages   = ['All Languages', 'yoruba', 'english', 'arabic', 'hausa', 'french']
  const days        = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const CAT_CHIP = {
    'All Categories': 'All', 'Quran Studies': 'Quran',
    'Hadith Explanations': 'Hadith', 'Islamic Law': 'Fiqh',
    'Spirituality': 'Spirituality', 'Language': 'Language',
  }
  const DAY_CHIP = {
    'All Days': 'Any', 'Sunday': 'Sun', 'Monday': 'Mon', 'Tuesday': 'Tue',
    'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat',
  }
  const LANG_CHIP = {
    'All Languages': 'Any', 'yoruba': 'Yoruba', 'english': 'English',
    'arabic': 'Arabic', 'hausa': 'Hausa', 'french': 'French',
  }
  const CAT_COLOR = {
    'Quran Studies': '#4ADE80', 'Hadith Explanations': '#60A5FA',
    'Islamic Law': '#A78BFA',   'Spirituality': '#F59E0B',
    'Language': '#F472B6',      'General': '#94A3B8',
  }

  function catColor(cat) { return CAT_COLOR[cat] || CAT_COLOR['General'] }

  const API_KEY    = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

  async function fetchHalqahs(reset = false) {
    try {
      if (reset) { currentPage = 1; halqahs = [] }
      loading = true
      error = null
      const offset = (currentPage - 1) * PAGE_SIZE
      const url = `${SUPABASE_URL}/rest/v1/halqahs?status=eq.published&limit=${PAGE_SIZE}&offset=${offset}&order=created_at.desc`
      const response = await fetch(url, {
        headers: { 'apikey': API_KEY, 'Authorization': 'Bearer ' + API_KEY },
      })
      if (!response.ok) { error = 'Could not load sessions (HTTP ' + response.status + ')'; loading = false; return }
      const data = await response.json()
      halqahs = reset ? data : [...halqahs, ...data]
      if (reset) loadSavedSessions()
    } catch (e) {
      console.error('Fetch error:', e)
      error = e.message
    } finally { loading = false }
  }

  let countFetched = $state(false)

  async function fetchCount() {
    try {
      const url = `${SUPABASE_URL}/rest/v1/halqahs?status=eq.published&select=id`
      const response = await fetch(url, {
        headers: { 'apikey': API_KEY, 'Authorization': 'Bearer ' + API_KEY },
      })
      if (response.ok) {
        const data = await response.json()
        totalCount = data.length
        countFetched = true
      }
    } catch (e) { console.error('fetchCount error:', e) }
  }

  async function loadMore() {
    if (loadingMore || halqahs.length < PAGE_SIZE) return
    currentPage++
    loadingMore = true
    await fetchHalqahs(false)
    loadingMore = false
  }

  function loadSavedSessions() {
    try {
      const saved = localStorage.getItem('savedSessions')
      savedSessions = saved ? JSON.parse(saved) : []
    } catch { savedSessions = [] }
  }

  function toggleSave(halqah, e) {
    if (e) e.stopPropagation()
    const already = savedSessions.includes(halqah.id)
    savedSessions = already
      ? savedSessions.filter(id => id !== halqah.id)
      : [...savedSessions, halqah.id]
    localStorage.setItem('savedSessions', JSON.stringify(savedSessions))
  }

  function isSaved(id) { return savedSessions.includes(id) }

  function getCategoryName(cat) {
    if (!cat) return 'General'
    try { return JSON.parse(cat).name || 'General' } catch { return 'General' }
  }

  function getDayIndex(day) { return dayOptions.indexOf(day) }

  let uniqueLecturers = $derived.by(() =>
    [...new Set(halqahs.map(h => h.lecturer).filter(Boolean))].sort()
  )

  let filteredHalqahs = $derived.by(() => {
    return halqahs.filter(h => {
      const matchesSearch = !searchQuery ||
        h.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.lecturer?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All Categories' || getCategoryName(h.category) === selectedCategory
      const matchesDay = selectedDay === 'All Days' || (h.schedule?.recurring?.days || []).includes(getDayIndex(selectedDay))
      const matchesLanguage = selectedLanguage === 'All Languages' || h.language?.toLowerCase() === selectedLanguage.toLowerCase()
      const matchesSpeaker = !selectedSpeaker || h.lecturer === selectedSpeaker
      return matchesSearch && matchesCategory && matchesDay && matchesLanguage && matchesSpeaker
    })
  })

  function getDays(sched) {
    if (!sched?.recurring?.days) return ''
    return sched.recurring.days.map(d => days[d]).join(' · ')
  }

  function getDaysFull(sched) {
    if (!sched?.recurring?.days) return ''
    return sched.recurring.days.map(d => dayOptions[d]).join(', ')
  }

  function getTime(sched) {
    const start = sched?.recurring?.start_time
    const end   = sched?.recurring?.end_time
    if (!start && !end) return ''
    if (!start || !end) return start || end
    return start + ' – ' + end
  }

  function hasMore() {
    if (loadingMore) return false
    if (countFetched && totalCount > 0) return halqahs.length < totalCount
    return halqahs.length >= PAGE_SIZE
  }

  async function requestNotificationPermission() {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') { notificationsEnabled = true; return true }
    if (Notification.permission === 'denied') return false
    const permission = await Notification.requestPermission()
    notificationsEnabled = permission === 'granted'
    return notificationsEnabled
  }

  function toggleReminder(halqah) {
    const current = sessionReminders[halqah.id] || false
    sessionReminders = { ...sessionReminders, [halqah.id]: !current }
    localStorage.setItem('sessionReminders', JSON.stringify(sessionReminders))
    if (!current && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      console.log('Reminder scheduled for:', halqah.title)
    }
  }

  function hasReminder(id) { return sessionReminders[id] || false }

  function checkReminders() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    halqahs.forEach(halqah => {
      if (!sessionReminders[halqah.id]) return
      if (!halqah.schedule?.recurring?.days || !halqah.schedule?.recurring?.start_time) return
      if (halqah.schedule.recurring.days.indexOf(currentDay) === -1) return
      const [h, m] = halqah.schedule.recurring.start_time.split(':').map(Number)
      const start = h * 60 + m
      if (currentTime >= start - 15 && currentTime < start - 14) {
        new Notification('Session Starting Soon', {
          body: `${halqah.title} starts in 15 minutes`,
          icon: '/images/Halqoh Logo.png',
        })
      }
    })
  }

  function clearFilters() {
    selectedCategory = 'All Categories'
    selectedDay = 'All Days'
    selectedLanguage = 'All Languages'
    selectedSpeaker = ''
  }

  let hasActiveFilters = $derived.by(() =>
    selectedCategory !== 'All Categories' ||
    selectedDay !== 'All Days' ||
    selectedLanguage !== 'All Languages' ||
    selectedSpeaker !== ''
  )

  onMount(() => {
    Promise.all([fetchHalqahs(true), fetchCount()]).catch(e => console.error('onMount fetch error:', e))
    try {
      const saved = localStorage.getItem('sessionReminders')
      sessionReminders = saved ? JSON.parse(saved) : {}
    } catch {}
    if ('Notification' in window) notificationsEnabled = Notification.permission === 'granted'
    checkReminders()
    const interval = setInterval(checkReminders, 60000)
    return () => clearInterval(interval)
  })
</script>

<!-- ─── SHELL ─────────────────────────────────────────────── -->
<div class="app">

  <!-- Ambient background orbs -->
  <div class="bg-orbs" aria-hidden="true">
    <div class="orb orb-gold"></div>
    <div class="orb orb-sage"></div>
  </div>

  <!-- ── NAV ── -->
  <nav class="navbar">
    <div class="brand">
      <img src="/images/Halqoh Logo.png" alt="Halqah" class="logo" />
      <span class="brand-name">Halqah</span>
    </div>
    <div class="nav-right">
      <button class="icon-btn" onclick={() => showAbout = true} aria-label="About">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
      </button>
      <a href="/mysessions.html" class="icon-btn" aria-label="My saved sessions">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
        </svg>
        {#if savedSessions.length > 0}
          <span class="nav-badge">{savedSessions.length}</span>
        {/if}
      </a>
    </div>
  </nav>

  <!-- ── HERO ── -->
  <header class="hero">
    <p class="hero-eyebrow">السلام عليكم</p>
    <h1 class="hero-title"><em>Discover</em> Sessions</h1>
    <p class="hero-sub">Islamic knowledge circles, found for you</p>
  </header>

  <!-- ── SEARCH + FILTER TOGGLE ── -->
  <div class="search-wrap">
    <div class="search-field">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        type="search"
        placeholder="Search sessions or teachers…"
        bind:value={searchQuery}
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      {#if searchQuery}
        <button class="search-clear" onclick={() => searchQuery = ''} aria-label="Clear search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      {/if}
    </div>
    <button
      class="filter-toggle"
      class:open={filtersOpen}
      class:active={hasActiveFilters}
      onclick={() => filtersOpen = !filtersOpen}
      aria-label="Toggle filters"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M7 12h10M11 18h2"/>
      </svg>
      {#if hasActiveFilters}
        <span class="filter-dot"></span>
      {/if}
    </button>
  </div>

  <!-- ── FILTER PANEL (collapsible) ── -->
  {#if filtersOpen}
    <div class="filter-panel">
      <div class="filter-group">
        <span class="filter-label">Category</span>
        <div class="chips-row" role="group">
          {#each categories as cat}
            <button class="chip" class:active={selectedCategory === cat}
              onclick={() => selectedCategory = cat}>{CAT_CHIP[cat] || cat}</button>
          {/each}
        </div>
      </div>
      <div class="filter-group">
        <span class="filter-label">Day</span>
        <div class="chips-row" role="group">
          {#each dayOptions as day}
            <button class="chip" class:active={selectedDay === day}
              onclick={() => selectedDay = day}>{DAY_CHIP[day] || day}</button>
          {/each}
        </div>
      </div>
      <div class="filter-group">
        <span class="filter-label">Language</span>
        <div class="chips-row" role="group">
          {#each languages as lang}
            <button class="chip" class:active={selectedLanguage === lang}
              onclick={() => selectedLanguage = lang}>{LANG_CHIP[lang] || lang}</button>
          {/each}
        </div>
      </div>
      {#if uniqueLecturers.length > 0}
        <div class="filter-group">
          <span class="filter-label">Lecturer</span>
          <div class="chips-row" role="group">
            <button class="chip" class:active={selectedSpeaker === ''}
              onclick={() => selectedSpeaker = ''}>Any</button>
            {#each uniqueLecturers as lecturer}
              <button class="chip" class:active={selectedSpeaker === lecturer}
                onclick={() => selectedSpeaker = lecturer}>{lecturer}</button>
            {/each}
          </div>
        </div>
      {/if}
      {#if hasActiveFilters}
        <button class="clear-all" onclick={() => { clearFilters(); filtersOpen = false }}>✕ Clear all</button>
      {/if}
    </div>
  {/if}

  <!-- ── CONTENT ── -->
  <main class="content">
    {#if hasActiveFilters && !loading}
      <p class="results-meta">{filteredHalqahs.length} of {halqahs.length} sessions</p>
    {/if}

    {#if loading && halqahs.length === 0}
      <!-- Skeleton cards -->
      <div class="cards">
        {#each {length: 6} as _, i}
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
        <button class="cta-btn" onclick={() => fetchHalqahs(true)}>Try again</button>
      </div>

    {:else if filteredHalqahs.length === 0}
      <div class="empty-state">
        <p class="empty-icon">🔍</p>
        <p class="empty-label">No sessions match your filters</p>
        {#if hasActiveFilters}
          <button class="cta-btn" onclick={clearFilters}>Clear filters</button>
        {/if}
      </div>

    {:else}
      <div class="cards">
        {#each filteredHalqahs as halqah, i}
          {@const cat = getCategoryName(halqah.category)}
          {@const color = catColor(cat)}
          <div
            class="card"
            style="--cat:{color}; --delay:{Math.min(i, 10) * 45}ms"
            onclick={() => selectedSession = halqah}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && (selectedSession = halqah)}
          >
            <div class="card-top">
              <span class="cat-tag" style="--cat:{color}">{cat}</span>
              <button
                class="save-btn"
                class:saved={isSaved(halqah.id)}
                onclick={(e) => toggleSave(halqah, e)}
                aria-label={isSaved(halqah.id) ? 'Unsave session' : 'Save session'}
              >
                <svg viewBox="0 0 24 24" fill={isSaved(halqah.id) ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
                </svg>
              </button>
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
          </div>
        {/each}
      </div>

      {#if loadingMore}
        <div class="load-more-wrap">
          <span class="dot-loader"><i></i><i></i><i></i></span>
        </div>
      {:else if hasMore()}
        <button class="load-more-btn" onclick={loadMore}>Load more sessions</button>
      {/if}
    {/if}
  </main>

  <!-- ── BOTTOM NAV ── -->
  <nav class="bottom-nav" aria-label="Main navigation">
    <a href="/" class="bnav-item active" aria-current="page">
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
      {#if savedSessions.length > 0}
        <span class="bnav-pip"></span>
      {/if}
    </a>
    <button class="bnav-item" onclick={() => showAbout = true}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
      </svg>
      <span>About</span>
    </button>
  </nav>

  <!-- ── SESSION MODAL ── -->
  {#if selectedSession}
    {@const cat  = getCategoryName(selectedSession.category)}
    {@const color = catColor(cat)}
    <div class="overlay" onclick={() => selectedSession = null} role="dialog" aria-modal="true" aria-label="Session details">
      <div class="sheet" onclick={(e) => e.stopPropagation()}>
        <div class="sheet-handle" aria-hidden="true"></div>
        <button class="sheet-close" onclick={() => selectedSession = null} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <!-- Header -->
        <div class="sheet-header" style="--cat:{color}">
          <span class="cat-tag" style="--cat:{color}">{cat}</span>
          <h2 class="sheet-title">{selectedSession.title}</h2>
          {#if selectedSession.lecturer}
            <p class="sheet-lecturer">{selectedSession.lecturer}</p>
          {/if}
        </div>

        <!-- Body -->
        <div class="sheet-body">
          {#if selectedSession.summary || selectedSession.about}
            <p class="sheet-summary">{selectedSession.summary || selectedSession.about}</p>
          {/if}

          <div class="detail-grid">
            <div class="detail-row">
              <span class="detail-label">Schedule</span>
              <span class="detail-val">{getDaysFull(selectedSession.schedule) || '—'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time</span>
              <span class="detail-val">{getTime(selectedSession.schedule) || '—'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Mode</span>
              <span class="detail-val">{selectedSession.schedule?.mode || 'Online'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Language</span>
              <span class="detail-val" style="text-transform:capitalize">{selectedSession.language || '—'}</span>
            </div>
            {#if selectedSession.subcategory}
              <div class="detail-row">
                <span class="detail-label">Topic</span>
                <span class="detail-val">{selectedSession.subcategory}</span>
              </div>
            {/if}
          </div>

          {#if selectedSession.schedule?.onlineLinks?.length}
            <div class="join-section">
              <p class="join-label">Join Links</p>
              <div class="join-links">
                {#each selectedSession.schedule.onlineLinks as link}
                  <a href={link.link} target="_blank" rel="noopener noreferrer" class="join-btn">
                    <span class="join-platform">{link.platform}</span>
                    <span>Join {link.platform} →</span>
                  </a>
                {/each}
              </div>
            </div>
          {/if}

          <div class="sheet-actions">
            <button
              class="action-btn secondary"
              class:on={hasReminder(selectedSession.id)}
              onclick={() => requestNotificationPermission().then(() => toggleReminder(selectedSession))}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {hasReminder(selectedSession.id) ? 'Reminder On' : 'Remind Me'}
            </button>
            <button
              class="action-btn primary"
              class:saved={isSaved(selectedSession.id)}
              onclick={() => toggleSave(selectedSession)}
            >
              <svg viewBox="0 0 24 24" fill={isSaved(selectedSession.id) ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
              </svg>
              {isSaved(selectedSession.id) ? 'Saved ✓' : 'Save Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── ABOUT MODAL ── -->
  {#if showAbout}
    <div class="overlay" onclick={() => showAbout = false} role="dialog" aria-modal="true" aria-label="About Halqah">
      <div class="sheet" onclick={(e) => e.stopPropagation()}>
        <div class="sheet-handle" aria-hidden="true"></div>
        <button class="sheet-close" onclick={() => showAbout = false} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div class="about-header">
          <div class="about-logo-ring">
            <img src="/images/Halqoh Logo.png" alt="Halqah" class="about-logo" />
          </div>
          <h2 class="about-title">Halqah Directories</h2>
          <p class="about-sub">Discover Islamic Knowledge Sessions</p>
        </div>

        <div class="sheet-body">
          <div class="about-card">
            <div class="about-card-icon">📖</div>
            <div>
              <h3>What is Halqah?</h3>
              <p>A curated directory of authentic Islamic knowledge sessions compiled for the Ummah. We make it easy to discover beneficial gatherings from trusted scholars.</p>
            </div>
          </div>
          <div class="about-card">
            <div class="about-card-icon">🌙</div>
            <div>
              <h3>Our Mission</h3>
              <p>We ask Allah to accept this effort as <strong>ibadah</strong>. This is a free service with no ads, no subscriptions — only sincerity.</p>
            </div>
          </div>
          <div class="about-card">
            <div class="about-card-icon">✉️</div>
            <div>
              <h3>Get Involved</h3>
              <p>Know a beneficial session? Reach out and we'll consider adding it to the directory.</p>
              <a href="mailto:abooubaydah01@gmail.com" class="about-contact">Contact Us →</a>
            </div>
          </div>

          <div class="about-footer">
            <p>Made with care for the Ummah</p>
            <p class="dua">May Allah grant us Jannah</p>
          </div>
        </div>
      </div>
    </div>
  {/if}

</div>

<!-- ─── STYLES ──────────────────────────────────────────────── -->
<style>
  /* ── Tokens ── */
  :root {
    --ink:      #07101C;
    --ink-1:    #0C1827;
    --gold:     #C8922A;
    --gold-lt:  #E0B860;
    --gold-dim: rgba(200,146,42,.12);
    --sage:     #4BBFAD;
    --cream:    #EDE5D8;
    --c60:      rgba(237,229,216,.60);
    --c30:      rgba(237,229,216,.30);
    --c12:      rgba(237,229,216,.12);
    --c06:      rgba(237,229,216,.06);
    --border:   rgba(237,229,216,.08);
    --bmd:      rgba(237,229,216,.14);
    --r:        14px;
    --rpill:    100px;
  }

  /* ── Shell ── */
  .app {
    min-height: 100vh;
    background: var(--ink);
    background-image:
      radial-gradient(ellipse 70% 40% at 10% 5%,  rgba(200,146,42,.07) 0%, transparent 65%),
      radial-gradient(ellipse 50% 50% at 90% 95%, rgba(75,191,173,.05) 0%, transparent 60%);
    color: var(--cream);
    font-family: 'Sora', system-ui, sans-serif;
    padding-bottom: 6rem;
    position: relative;
    overflow-x: hidden;
  }

  /* ── Ambient orbs ── */
  .bg-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: .35;
  }
  .orb-gold  { width: 400px; height: 300px; top: -80px;  left: -100px; background: radial-gradient(circle, rgba(200,146,42,.5), transparent 70%); }
  .orb-sage  { width: 350px; height: 350px; bottom: -60px; right: -80px; background: radial-gradient(circle, rgba(75,191,173,.4), transparent 70%); }

  /* ── Navbar ── */
  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: .875rem 1.25rem;
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(7,16,28,.88);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }

  .brand { display: flex; align-items: center; gap: .625rem; }
  .logo  { height: 28px; width: auto; }
  .brand-name {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 1.1rem;
    font-weight: 500;
    letter-spacing: -.02em;
  }

  .nav-right { display: flex; align-items: center; gap: .5rem; }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px; height: 38px;
    border-radius: 10px;
    background: var(--c06);
    border: 1px solid var(--border);
    color: var(--c60);
    cursor: pointer;
    transition: background .15s, color .15s;
    text-decoration: none;
    position: relative;
    flex-shrink: 0;
  }
  .icon-btn:hover  { background: var(--c12); color: var(--cream); }
  .icon-btn svg    { width: 18px; height: 18px; }

  .nav-badge {
    position: absolute;
    top: -4px; right: -4px;
    background: var(--gold);
    color: var(--ink);
    font-size: .55rem;
    font-weight: 700;
    min-width: 16px; height: 16px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 3px;
  }

  /* ── Hero ── */
  .hero {
    padding: 2rem 1.25rem 1.25rem;
    position: relative;
  }
  .hero::after {
    content: '';
    display: block;
    width: 40px; height: 2px;
    background: linear-gradient(90deg, var(--gold), transparent);
    border-radius: 2px;
    margin-top: 1rem;
  }

  .hero-eyebrow {
    font-size: .8rem;
    color: var(--gold);
    opacity: .75;
    margin-bottom: .35rem;
    letter-spacing: .04em;
  }
  .hero-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: clamp(2rem, 8vw, 2.75rem);
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: -.03em;
    margin-bottom: .4rem;
  }
  .hero-title em { font-style: italic; color: var(--gold-lt); }
  .hero-sub { font-size: .88rem; color: var(--c60); line-height: 1.5; }

  /* ── Search ── */
  .search-wrap {
    padding: 0 1.25rem .875rem;
    display: flex;
    gap: .5rem;
    align-items: center;
  }

  .search-field {
    flex: 1;
    display: flex;
    align-items: center;
    gap: .6rem;
    background: var(--c06);
    border: 1.5px solid var(--border);
    border-radius: 12px;
    padding: 0 .875rem;
    height: 46px;
    transition: border-color .2s, background .2s;
    min-width: 0;
  }
  .search-field:focus-within {
    border-color: var(--gold);
    background: rgba(200,146,42,.06);
  }
  .search-field > svg { width: 17px; height: 17px; color: var(--c30); flex-shrink: 0; transition: color .2s; }
  .search-field:focus-within > svg { color: var(--gold); }

  .search-field input {
    flex: 1; min-width: 0;
    background: none; border: none;
    color: var(--cream);
    font-family: 'Sora', system-ui, sans-serif;
    font-size: .875rem;
    outline: none;
  }
  .search-field input::placeholder { color: var(--c30); }

  .search-clear {
    background: none; border: none;
    color: var(--c30); cursor: pointer;
    display: flex; align-items: center;
    padding: 0; transition: color .15s; flex-shrink: 0;
  }
  .search-clear:hover { color: var(--cream); }
  .search-clear svg { width: 14px; height: 14px; }

  /* ── Filter toggle button ── */
  .filter-toggle {
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    width: 46px; height: 46px;
    border-radius: 12px;
    background: var(--c06);
    border: 1.5px solid var(--border);
    color: var(--c60);
    cursor: pointer;
    transition: all .15s;
    position: relative;
  }
  .filter-toggle svg { width: 17px; height: 17px; }
  .filter-toggle:hover  { background: var(--c12); color: var(--cream); border-color: var(--bmd); }
  .filter-toggle.open   { background: var(--c12); color: var(--cream); border-color: var(--bmd); }
  .filter-toggle.active { border-color: rgba(200,146,42,.4); color: var(--gold); background: var(--gold-dim); }

  .filter-dot {
    position: absolute; top: 7px; right: 7px;
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--gold);
  }

  /* ── Filter panel ── */
  .filter-panel {
    padding: 0 1.25rem .875rem;
    display: flex; flex-direction: column; gap: .625rem;
    animation: fadeUp .18s ease both;
  }

  .filter-group {
    display: flex; flex-direction: column; gap: .35rem;
  }

  .filter-label {
    font-size: .65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: var(--c30);
    padding-left: .25rem;
  }

  .chips-row {
    display: flex; gap: .3rem;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .chips-row::-webkit-scrollbar { display: none; }

  .chip {
    display: inline-flex; align-items: center;
    white-space: nowrap;
    padding: .28rem .65rem;
    border-radius: var(--rpill);
    font-family: 'Sora', system-ui, sans-serif;
    font-size: .72rem; font-weight: 500;
    border: 1.5px solid var(--bmd);
    background: var(--c06); color: var(--c60);
    cursor: pointer; transition: all .15s; flex-shrink: 0;
  }
  .chip:hover  { border-color: var(--c30); color: var(--cream); }
  .chip.active { background: var(--gold); border-color: var(--gold); color: var(--ink); font-weight: 600; }

  .clear-all {
    align-self: flex-start;
    font-family: 'Sora', system-ui, sans-serif;
    font-size: .72rem; color: var(--sage);
    background: none; border: none; cursor: pointer;
    padding: .15rem 0; opacity: .8; transition: opacity .15s;
  }
  .clear-all:hover { opacity: 1; }

  /* ── Results meta ── */
  .results-meta {
    font-size: .75rem;
    color: var(--c30);
    padding: 0 0 .75rem;
  }

  /* ── Content ── */
  .content { padding: 0 1.25rem; position: relative; z-index: 1; }

  /* ── Cards ── */
  .cards {
    display: flex;
    flex-direction: column;
    gap: .625rem;
  }

  @media (min-width: 640px) {
    .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: .75rem; }
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: .45rem;
    background: var(--c06);
    border: 1px solid var(--border);
    border-left: 3px solid var(--cat, var(--gold));
    border-radius: var(--r);
    padding: .875rem 1rem;
    cursor: pointer;
    text-align: left;
    color: var(--cream);
    position: relative;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
    transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s, background .15s, border-color .15s;
    animation: fadeUp .45s cubic-bezier(.22,1,.36,1) both;
    animation-delay: var(--delay, 0ms);
  }
  .card::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, var(--cat, var(--gold)), transparent 60%);
    opacity: .35;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,.35);
    background: var(--c12);
    border-color: var(--bmd);
  }
  .card:active { transform: translateY(0); }

  /* ── Card top row ── */
  .card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem; }

  .cat-tag {
    display: inline-flex;
    align-items: center;
    padding: .18rem .5rem;
    border-radius: var(--rpill);
    font-size: .62rem;
    font-weight: 600;
    letter-spacing: .04em;
    text-transform: uppercase;
    /* fallback, then color-mix */
    background: rgba(200,146,42,.13);
    background: color-mix(in srgb, var(--cat, var(--gold)) 13%, transparent);
    color: var(--cat, var(--gold));
  }

  .save-btn {
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px;
    border-radius: 8px;
    background: none; border: none;
    color: var(--c30); cursor: pointer;
    transition: color .15s, background .15s;
    padding: 0;
  }
  .save-btn svg    { width: 15px; height: 15px; }
  .save-btn:hover  { color: var(--gold); background: var(--gold-dim); }
  .save-btn.saved  { color: var(--gold); }

  /* ── Card body ── */
  .card-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: .98rem;
    font-weight: 500;
    line-height: 1.35;
    letter-spacing: -.01em;
    color: var(--cream);
    margin: 0;
  }
  .card-lecturer { font-size: .8rem; color: var(--sage); margin: 0; }

  .card-meta { display: flex; flex-wrap: wrap; gap: .35rem .6rem; }
  .meta-chip {
    display: inline-flex; align-items: center; gap: .25rem;
    font-size: .7rem; color: var(--c30);
  }
  .meta-chip svg { width: 11px; height: 11px; flex-shrink: 0; }
  .meta-chip.lang {
    background: var(--c06);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: .1rem .35rem;
    text-transform: capitalize;
  }

  /* ── Skeleton ── */
  .card.skeleton { border-left-color: var(--border); pointer-events: none; }
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
  .empty-state { text-align: center; padding: 4rem 1rem; }
  .empty-icon  { font-size: 2.5rem; margin-bottom: .75rem; opacity: .45; }
  .empty-label { font-size: .9rem; color: var(--c30); margin-bottom: 1.25rem; }
  .cta-btn {
    padding: .625rem 1.5rem;
    background: var(--gold);
    border: none;
    border-radius: var(--rpill);
    color: var(--ink);
    font-family: 'Sora', system-ui, sans-serif;
    font-size: .875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
  }
  .cta-btn:hover { background: var(--gold-lt); }

  /* ── Load more ── */
  .load-more-btn {
    display: block; width: 100%; margin-top: 1.25rem;
    padding: .875rem;
    background: var(--c06);
    border: 1px solid var(--bmd);
    border-radius: var(--r);
    color: var(--c60);
    font-family: 'Sora', system-ui, sans-serif;
    font-size: .875rem;
    cursor: pointer;
    transition: background .15s, color .15s;
  }
  .load-more-btn:hover { background: var(--c12); color: var(--cream); }

  .load-more-wrap { display: flex; justify-content: center; padding: 1.5rem; }
  .dot-loader { display: flex; gap: .4rem; align-items: center; }
  .dot-loader i {
    display: block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--gold);
    animation: dotPulse 1.2s ease-in-out infinite;
    font-style: normal;
  }
  .dot-loader i:nth-child(2) { animation-delay: .2s; }
  .dot-loader i:nth-child(3) { animation-delay: .4s; }

  /* ── Bottom nav ── */
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: .875rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(10,18,32,.94);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    border: 1px solid var(--bmd);
    border-radius: var(--rpill);
    padding: .5rem .75rem;
    gap: .25rem;
    box-shadow: 0 8px 40px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.04);
    z-index: 100;
  }

  .bnav-item {
    display: flex; flex-direction: column; align-items: center;
    gap: .18rem;
    padding: .4rem .875rem;
    border-radius: 40px;
    font-family: 'Sora', system-ui, sans-serif;
    font-size: .62rem;
    font-weight: 500;
    color: var(--c30);
    text-decoration: none;
    border: none; background: none;
    cursor: pointer;
    transition: color .2s, background .2s;
    position: relative;
  }
  .bnav-item svg { width: 19px; height: 19px; transition: transform .2s; }
  .bnav-item:hover,
  .bnav-item.active { color: var(--gold); background: var(--gold-dim); }
  .bnav-item.active svg { transform: scale(1.1); }

  .bnav-pip {
    position: absolute;
    top: 4px; right: 4px;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--gold);
  }

  /* ── Overlay / Bottom sheet ── */
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.7);
    display: flex; align-items: flex-end; justify-content: center;
    z-index: 1000;
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    animation: fadeIn .2s ease;
  }

  .sheet {
    background: var(--ink-1);
    width: 100%;
    max-width: 600px;
    border-radius: 24px 24px 0 0;
    max-height: 88vh;
    overflow-y: auto;
    position: relative;
    animation: slideUp .35s cubic-bezier(.22,1,.36,1);
    border: 1px solid var(--border);
    border-bottom: none;
    -webkit-overflow-scrolling: touch;
  }

  .sheet-handle {
    width: 36px; height: 4px;
    background: var(--c12); border-radius: 2px;
    margin: .875rem auto 0;
    flex-shrink: 0;
  }

  .sheet-close {
    position: absolute;
    top: 1rem; right: 1rem;
    width: 32px; height: 32px;
    background: var(--c06);
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--c60);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s, color .15s;
    z-index: 10;
  }
  .sheet-close:hover { background: var(--c12); color: var(--cream); }
  .sheet-close svg { width: 14px; height: 14px; }

  /* ── Sheet header ── */
  .sheet-header {
    padding: 1.25rem 1.25rem .875rem;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, color-mix(in srgb, var(--cat, var(--gold)) 6%, transparent), transparent);
    /* fallback */
    background: linear-gradient(180deg, rgba(200,146,42,.06), transparent);
    background: linear-gradient(180deg, color-mix(in srgb, var(--cat, var(--gold)) 6%, transparent), transparent);
  }
  .sheet-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 1.45rem;
    font-weight: 500;
    line-height: 1.2;
    letter-spacing: -.02em;
    margin: .5rem 0 .3rem;
  }
  .sheet-lecturer { font-size: .9rem; color: var(--sage); }

  /* ── Sheet body ── */
  .sheet-body { padding: 1.25rem; }

  .sheet-summary {
    font-size: .875rem;
    color: var(--c60);
    line-height: 1.65;
    margin-bottom: 1.25rem;
  }

  /* ── Detail grid ── */
  .detail-grid {
    background: var(--c06);
    border: 1px solid var(--border);
    border-radius: var(--r);
    overflow: hidden;
    margin-bottom: 1.25rem;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: .7rem 1rem;
    border-bottom: 1px solid var(--border);
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { font-size: .78rem; color: var(--c30); flex-shrink: 0; }
  .detail-val   { font-size: .85rem; color: var(--cream); font-weight: 500; text-align: right; }

  /* ── Join links ── */
  .join-section { margin-bottom: 1.25rem; }
  .join-label {
    font-size: .7rem;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--c30);
    font-weight: 600;
    margin-bottom: .625rem;
  }
  .join-links { display: flex; flex-direction: column; gap: .5rem; }
  .join-btn {
    display: flex; align-items: center; gap: .75rem;
    padding: .75rem 1rem;
    background: var(--gold-dim);
    border: 1px solid rgba(200,146,42,.2);
    border-radius: var(--r);
    color: var(--cream);
    text-decoration: none;
    font-size: .875rem; font-weight: 500;
    transition: background .15s, border-color .15s;
  }
  .join-btn:hover { background: rgba(200,146,42,.18); border-color: rgba(200,146,42,.35); }
  .join-platform {
    font-size: .68rem; color: var(--gold);
    font-weight: 600; text-transform: uppercase;
    letter-spacing: .05em; min-width: 56px;
  }

  /* ── Sheet actions ── */
  .sheet-actions {
    display: grid; grid-template-columns: 1fr 1fr; gap: .75rem;
    margin-top: 1.25rem;
  }

  .action-btn {
    display: flex; align-items: center; justify-content: center; gap: .4rem;
    padding: .875rem;
    border-radius: var(--r);
    font-family: 'Sora', system-ui, sans-serif;
    font-size: .85rem; font-weight: 600;
    cursor: pointer; border: none;
    transition: all .15s; width: 100%;
  }
  .action-btn svg { width: 17px; height: 17px; flex-shrink: 0; }

  .action-btn.secondary {
    background: var(--c06);
    border: 1px solid var(--bmd);
    color: var(--c60);
  }
  .action-btn.secondary:hover { background: var(--c12); color: var(--cream); }
  .action-btn.secondary.on {
    background: var(--gold-dim);
    border-color: rgba(200,146,42,.3);
    color: var(--gold);
  }
  .action-btn.primary { background: var(--gold); color: var(--ink); }
  .action-btn.primary:hover { background: var(--gold-lt); }
  .action-btn.primary.saved {
    background: rgba(200,146,42,.15);
    border: 1px solid rgba(200,146,42,.35);
    color: var(--gold);
  }

  /* ── About modal ── */
  .about-header {
    padding: 2rem 1.25rem 1.25rem;
    text-align: center;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(200,146,42,.06), transparent);
  }
  .about-logo-ring {
    width: 68px; height: 68px;
    border-radius: 20px;
    background: #fff;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto .875rem;
    box-shadow: 0 4px 24px rgba(0,0,0,.3);
  }
  .about-logo { width: 52px; height: 52px; object-fit: contain; border-radius: 14px; }
  .about-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 1.6rem; font-weight: 500;
    letter-spacing: -.02em; margin-bottom: .3rem;
  }
  .about-sub { font-size: .85rem; color: var(--c60); }

  .about-card {
    display: flex; gap: .875rem; align-items: flex-start;
    background: var(--c06);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 1rem;
    margin-bottom: .75rem;
  }
  .about-card-icon { font-size: 1.4rem; flex-shrink: 0; margin-top: .1rem; }
  .about-card h3 { font-size: .9rem; font-weight: 600; margin-bottom: .35rem; color: var(--cream); }
  .about-card p  { font-size: .83rem; color: var(--c60); line-height: 1.6; }
  .about-card strong { color: var(--gold); }
  .about-contact {
    display: inline-block;
    margin-top: .5rem;
    font-size: .8rem;
    color: var(--sage);
    font-weight: 500;
    transition: opacity .15s;
  }
  .about-contact:hover { opacity: .75; }

  .about-footer {
    text-align: center;
    padding-top: .875rem;
    border-top: 1px solid var(--border);
    margin-top: .875rem;
  }
  .about-footer p { font-size: .75rem; color: var(--c30); }
  .dua { color: var(--gold); margin-top: .2rem; font-weight: 500; opacity: .8; }

  /* ── Keyframes ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes dotPulse {
    0%, 80%, 100% { opacity: .3; transform: scale(.8); }
    40%           { opacity: 1; transform: scale(1); }
  }

  /* ── Desktop tweaks ── */
  @media (min-width: 768px) {
    .sheet { border-radius: 24px; }
    .overlay { align-items: center; padding: 1rem; }
  }
</style>
