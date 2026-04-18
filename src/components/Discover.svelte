<script>
  import { onMount } from 'svelte'

  let { onNavigate = null } = $props()

  let halqahs = $state([])
  let loading = $state(true)
  let loadingMore = $state(false)
  let error = $state(null)
  let currentPage = $state(1)
  let totalCount = $state(0)
  const PAGE_SIZE = 15
  let searchQuery = $state('')
  let selectedCategory = $state('All Categories')
  let selectedDay = $state('All Days')
  let selectedLanguage = $state('All Languages')
  let selectedSpeaker = $state('')
  let selectedSession = $state(null)
  let showAbout = $state(false)
  let isLive = $state(false)
  let filtersCollapsed = $state(true)
  let notificationsEnabled = $state(false)
  
  let savedSessions = $state([])
  let sessionReminders = $state({})

  const categories = ['All Categories', 'Quran Studies', 'Hadith Explanations', 'Islamic Law', 'Spirituality', 'Language']
  const dayOptions = ['All Days', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const languages = ['All Languages', 'yoruba', 'english', 'arabic', 'hausa', 'french']
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

  console.log('API_KEY:', API_KEY ? 'loaded' : 'missing')
  console.log('SUPABASE_URL:', SUPABASE_URL)

  async function fetchHalqahs(reset = false) {
    try {
      if (reset) {
        currentPage = 1
        halqahs = []
      }
      loading = true
      error = null
      
      const offset = (currentPage - 1) * PAGE_SIZE
      const url = `${SUPABASE_URL}/rest/v1/halqahs?status=eq.published&limit=${PAGE_SIZE}&offset=${offset}&order=created_at.desc`
      console.log('Fetching halqahs:', url)
      const response = await fetch(url, {
        headers: { 
          'apikey': API_KEY, 
          'Authorization': 'Bearer ' + API_KEY
        }
      })
      if (!response.ok) {
        error = 'HTTP ' + response.status
        loading = false
        return
      }
      
      const data = await response.json()
      console.log('Data received:', data.length)
      halqahs = reset ? data : [...halqahs, ...data]
      if (reset) loadSavedSessions()
    } catch (e) { 
      console.error('Fetch error:', e)
      error = e.message 
    } finally { loading = false }
  }

  let countFetched = $state(false)
  
  async function fetchCount() {
    const url = `${SUPABASE_URL}/rest/v1/halqahs?status=eq.published&select=id`
    const response = await fetch(url, {
      headers: { 'apikey': API_KEY, 'Authorization': 'Bearer ' + API_KEY }
    })
    if (response.ok) {
      const data = await response.json()
      totalCount = data.length
      countFetched = true
      console.log('Total count:', totalCount)
    }
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

  function toggleSave(halqah) {
    const isSaved = savedSessions.includes(halqah.id)
    if (isSaved) savedSessions = savedSessions.filter(id => id !== halqah.id)
    else savedSessions = [...savedSessions, halqah.id]
    localStorage.setItem('savedSessions', JSON.stringify(savedSessions))
  }

  function isSaved(id) { return savedSessions.includes(id) }

  function getCategoryName(cat) {
    if (!cat) return 'General'
    try { return JSON.parse(cat).name || 'General' }
    catch { return 'General' }
  }

  function getDayIndex(day) { return dayOptions.indexOf(day) }

  let filteredHalqahs = $derived(() => {
    console.log('Filtering:', halqahs.length, 'items')
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

  function getUniqueLecturers() {
    return [...new Set(halqahs.map(h => h.lecturer).filter(Boolean))].sort()
  }

  function getDays(sched) {
    if (!sched?.recurring?.days) return ''
    return sched.recurring.days.map(d => days[d]).join(', ')
  }

  function getDaysFull(sched) {
    if (!sched?.recurring?.days) return ''
    return sched.recurring.days.map(d => dayOptions[d]).join(', ')
  }

  function getTime(sched) {
    if (!sched?.recurring) return ''
    return sched.recurring.start_time + ' - ' + sched.recurring.end_time
  }

  function hasMore() {
    if (loadingMore) return false
    if (countFetched && totalCount > 0) return halqahs.length < totalCount
    return halqahs.length >= PAGE_SIZE
  }

  function getPlatformIcon(platform) {
    const icons = { telegram: 'Telegram', youtube: 'YouTube', facebook: 'Facebook', zoom: 'Zoom', meet: 'Meet' }
    return icons[platform?.toLowerCase()] || platform
  }

  async function requestNotificationPermission() {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') {
      notificationsEnabled = true
      return true
    }
    if (Notification.permission === 'denied') {
      return false
    }
    const permission = await Notification.requestPermission()
    notificationsEnabled = permission === 'granted'
    return notificationsEnabled
  }

  function toggleReminder(halqah) {
    const current = sessionReminders[halqah.id] || false
    sessionReminders = { ...sessionReminders, [halqah.id]: !current }
    localStorage.setItem('sessionReminders', JSON.stringify(sessionReminders))
    
    if (!current && Notification.permission === 'granted') {
      scheduleNotification(halqah)
    }
  }

  function hasReminder(id) {
    return sessionReminders[id] || false
  }

  function scheduleNotification(halqah) {
    // Just log for now - in production would use Service Worker for reliable notifications
    console.log('Reminder scheduled for:', halqah.title)
  }

  function checkReminders() {
    if (Notification.permission !== 'granted') return
    
    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    halqahs.forEach(halqah => {
      if (!sessionReminders[halqah.id]) return
      if (!halqah.schedule?.recurring?.days || !halqah.schedule?.recurring?.start_time) return
      
      const dayIndex = halqah.schedule.recurring.days.indexOf(currentDay)
      if (dayIndex === -1) return
      
      const [startH, startM] = halqah.schedule.recurring.start_time.split(':').map(Number)
      const startTime = startH * 60 + startM
      
      // Notify 15 minutes before
      if (currentTime >= startTime - 15 && currentTime < startTime - 14) {
        new Notification('Session Starting Soon', {
          body: `${halqah.title} starts in 15 minutes`,
          icon: '/images/Halqoh Logo.png'
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

  let hasActiveFilters = $derived(() => 
    selectedCategory !== 'All Categories' || selectedDay !== 'All Days' || selectedLanguage !== 'All Languages' || selectedSpeaker
  )

  onMount(() => {
    Promise.all([fetchHalqahs(true), fetchCount()])
    
    // Load reminder settings
    try {
      const saved = localStorage.getItem('sessionReminders')
      sessionReminders = saved ? JSON.parse(saved) : {}
    } catch {}
    
    // Load notification permission
    if ('Notification' in window) {
      notificationsEnabled = Notification.permission === 'granted'
    }
    
    // Check reminders every minute
    checkReminders()
    const interval = setInterval(checkReminders, 60000)
    return () => clearInterval(interval)
  })
</script>

<div class="discover">
  <nav class="navbar">
    <img src="/images/Halqoh Logo.png" alt="Halqoh" class="logo" />
    <div class="nav-right">
      <button class="text-btn" onclick={() => showAbout = true}>About</button>
      <a href="/mysessions.html" class="saved-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
        </svg>
        {#if savedSessions.length > 0}
          <span class="badge">{savedSessions.length}</span>
        {/if}
      </a>
    </div>
  </nav>

  <header class="hero">
    <h1>Discover</h1>
    <p>Find knowledge sessions</p>
  </header>

  <div class="search-row">
    <div class="search-bar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input type="text" placeholder="Search..." bind:value={searchQuery} />
      {#if searchQuery}<button class="clear" onclick={() => searchQuery = ''}>×</button>{/if}
    </div>
    <button class="filter-btn" class:active={!filtersCollapsed || hasActiveFilters()} onclick={() => filtersCollapsed = !filtersCollapsed}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21h16M4 10h16M4 3h16M4 14h16"/></svg>
      Filters
      {#if hasActiveFilters()}<span class="dot"></span>{/if}
    </button>
  </div>

  {#if !filtersCollapsed}
    <div class="filters">
      <select bind:value={selectedCategory}>
        {#each categories as cat}<option value={cat}>{cat}</option>{/each}
      </select>
      <select bind:value={selectedDay}>
        {#each dayOptions as day}<option value={day}>{day}</option>{/each}
      </select>
      <select bind:value={selectedLanguage}>
        {#each languages as lang}<option value={lang}>{lang}</option>{/each}
      </select>
      <select bind:value={selectedSpeaker}>
        <option value="">All Speakers</option>
        {#each getUniqueLecturers() as lecturer}
          <option value={lecturer}>{lecturer.length > 20 ? lecturer.slice(0, 20) + '...' : lecturer}</option>
        {/each}
      </select>
      {#if hasActiveFilters()}<button class="clear-btn" onclick={clearFilters}>Clear</button>{/if}
    </div>
    {#if !loading && halqahs.length > 0}
      <div class="results-count">
        {hasActiveFilters() ? `Showing ${filteredHalqahs().length} of ${halqahs.length}` : `${halqahs.length} sessions available`}
      </div>
    {/if}
  {/if}

  <main class="content">
    {#if loading && halqahs.length === 0}
      <div class="state"><div class="spinner"></div><p>Loading...</p></div>
    {:else if error}
      <div class="state"><p>{error}</p><button onclick={fetchHalqahs}>Retry</button></div>
    {:else if filteredHalqahs().length === 0}
      <div class="state"><p>No sessions found</p></div>
    {:else}
      <div class="cards">
        {#each filteredHalqahs() as halqah}
          <button class="card" onclick={() => selectedSession = halqah}>
            <div class="card-img">&#128218;</div>
            <div class="card-body">
              <span class="tag">{getCategoryName(halqah.category)}</span>
              <h3>{halqah.title}</h3>
              <p class="lecturer">{halqah.lecturer}</p>
              <p class="meta">{getDays(halqah.schedule)} · {getTime(halqah.schedule)}</p>
            </div>
          </button>
        {/each}
      </div>
      {#if loadingMore}
        <div class="load-more-loading"><div class="spinner-small"></div>Loading...</div>
      {:else if hasMore()}
        <button class="load-more" onclick={() => loadMore()}>Load More</button>
      {/if}
    {/if}
  </main>

  <nav class="bottom-nav">
    <a href="/" class="nav-link active">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <span>Discover</span>
    </a>
    <a href="/mysessions.html" class="nav-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>
      <span>Saved</span>
    </a>
    <button class="nav-link" onclick={() => showAbout = true}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      <span>About</span>
    </button>
  </nav>

  {#if selectedSession}
    <div class="modal-overlay" onclick={() => selectedSession = null}>
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <button class="close" onclick={() => selectedSession = null}>×</button>
        
        <div class="modal-header">
          <span class="tag">{getCategoryName(selectedSession.category)}</span>
          <h2>{selectedSession.title}</h2>
          <p class="lecturer">{selectedSession.lecturer}</p>
        </div>
        
        <div class="modal-body">
          {#if selectedSession.summary}<p class="about">{selectedSession.summary}</p>{/if}
          {#if selectedSession.about}<p class="about">{selectedSession.about}</p>{/if}
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Schedule</span>
              <span>{getDaysFull(selectedSession.schedule)} · {getTime(selectedSession.schedule)}</span>
            </div>
            <div class="detail-row">
              <span class="label">Mode</span>
              <span>{selectedSession.schedule?.mode || 'Online'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Language</span>
              <span>{selectedSession.language}</span>
            </div>
            {#if selectedSession.subcategory}
            <div class="detail-row">
              <span class="label">Topic</span>
              <span>{selectedSession.subcategory}</span>
            </div>
            {/if}
          </div>
          
          {#if selectedSession.schedule?.onlineLinks}
            <div class="links-section">
              <h4>Join Links</h4>
              <div class="links">
                {#each selectedSession.schedule.onlineLinks as link}
                  <a href={link.link} target="_blank" class="link-btn">
                    <span class="icon">{getPlatformIcon(link.platform)}</span>
                    <span>Join {link.platform}</span>
                  </a>
                {/each}
              </div>
            </div>
          {/if}
          
          <div class="actions">
            <button class="btn {hasReminder(selectedSession.id) ? 'active' : ''}" onclick={() => requestNotificationPermission().then(() => toggleReminder(selectedSession))}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
              {hasReminder(selectedSession.id) ? 'Reminder On' : 'Set Reminder'}
            </button>
            <button class="btn primary" onclick={() => toggleSave(selectedSession)}>
              {isSaved(selectedSession.id) ? '✓ Saved' : '+ Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if showAbout}
    <div class="modal-overlay" onclick={() => showAbout = null} role="dialog" aria-modal="true">
      <div class="about-modal" onclick={(e) => e.stopPropagation()}>
        <button class="close" onclick={() => showAbout = null}>×</button>
        
        <div class="about-header">
          <div class="about-logo-wrap">
            <img src="/images/Halqoh Logo.png" alt="Halqoh" class="about-logo-img" />
          </div>
          <h2>Halqah Directories</h2>
          <p class="about-subtitle">Discover Islamic Knowledge Sessions</p>
        </div>
        
        <div class="about-body">
          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              </span>
              <h3>What is Halqoh?</h3>
            </div>
            <p>A curated directory of authentic Islamic audio lectures (halqoh) compiled by seekers of knowledge for the Ummah. We make it easy to discover beneficial lectures from trusted scholars.</p>
          </div>

          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </span>
              <h3>Our Mission</h3>
            </div>
            <p>We ask Allah to accept this effort as <strong>ibadah</strong> and a means of drawing closer to Him. This is a free service with no ads or subscriptions.</p>
          </div>

          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4v4h-4z"/></svg>
              </span>
              <h3>Get Involved</h3>
            </div>
            <p>Know of a beneficial lecture? We'd love to hear about it. Reach out and we'll consider adding it to the directory.</p>
            <a href="mailto:abooubaydah01@gmail.com" class="about-contact-btn">
              Contact Us
            </a>
          </div>
        </div>

        <div class="about-footer">
          <p>Made with care for the Ummah</p>
          <p class="about-dua">May Allah grant us Jannah</p>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :root { --bg: #0c1b2b; --primary: #ff8a04; }
  .discover { min-height: 100vh; background: var(--bg); color: #fff; font-family: 'Inter', system-ui, sans-serif; padding-bottom: 70px; }
  
  .navbar { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: rgba(12,27,43,0.95); position: sticky; top: 0; z-index: 100; }
  .logo { height: 32px; }
  .nav-right { display: flex; align-items: center; gap: 0.5rem; }
  .text-btn { padding: 0.5rem 0.75rem; color: #fff; text-decoration: none; font-size: 0.9rem; background: none; border: none; cursor: pointer; }
  .saved-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 10px; color: #fff; position: relative; text-decoration: none; }
  .saved-btn svg { width: 20px; height: 20px; }
  .badge { position: absolute; top: -4px; right: -4px; background: var(--primary); color: var(--bg); font-size: 0.6rem; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
  
  .hero { padding: 1rem; }
  .hero h1 { font-size: 1.5rem; margin: 0; }
  .hero p { color: rgba(255,255,255,0.6); margin: 0.25rem 0 0; }
  
  .search-row { display: flex; gap: 0.5rem; padding: 0 1rem 1rem; }
  .search-bar { flex: 1; display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.08); border-radius: 10px; padding: 0 0.75rem; min-height: 44px; }
  .search-bar svg { width: 20px; height: 20px; opacity: 0.5; flex-shrink: 0; }
  .search-bar input { flex: 1; background: none; border: none; color: #fff; font-size: 1rem; outline: none; }
  .clear { background: none; border: none; color: #fff; font-size: 1.25rem; cursor: pointer; }
  
  .filter-btn { display: flex; align-items: center; gap: 0.35rem; padding: 0 0.75rem; background: rgba(255,255,255,0.1); border-radius: 10px; color: #fff; min-height: 44px; position: relative; cursor: pointer; border: none; font-size: 0.9rem; }
  .filter-btn svg { width: 18px; height: 18px; }
  .dot { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; background: var(--primary); border-radius: 50%; }
  
  .filters { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; padding: 0 1rem 1rem; }
  .filters select { padding: 0.6rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 0.9rem; }
  .filters option { background: var(--bg); }
  .clear-btn { grid-column: span 2; padding: 0.6rem; background: rgba(255,255,255,0.1); border: none; border-radius: 8px; color: var(--primary); cursor: pointer; }
  
  .results-count { padding: 0.5rem 1rem 1rem; font-size: 0.85rem; color: rgba(255,255,255,0.6); }
  
  .content { padding: 0 1rem; }
  .state { text-align: center; padding: 3rem 1rem; color: rgba(255,255,255,0.6); }
  .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
  .spinner-small { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
  .load-more-loading { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.875rem; color: rgba(255,255,255,0.6); font-size: 0.9rem; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .state button { margin-top: 1rem; padding: 0.6rem 1.5rem; background: var(--primary); border: none; border-radius: 8px; color: var(--bg); cursor: pointer; }
  
  .cards { display: flex; flex-direction: column; gap: 0.5rem; }
  .card { display: flex; gap: 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.75rem; cursor: pointer; text-align: left; color: #fff; width: 100%; }
  .card-img { width: 50px; height: 50px; background: linear-gradient(135deg, #1a3a5c, var(--bg)); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
  .card-body { flex: 1; min-width: 0; }
  .tag { display: inline-block; font-size: 0.6rem; padding: 0.15rem 0.4rem; background: rgba(255,138,0,15%); color: var(--primary); border-radius: 4px; }
  .card-body h3 { font-size: 0.95rem; margin: 0.35rem 0 0.2rem; }
  .lecturer { color: var(--primary); font-size: 0.8rem; margin: 0; }
  .meta { font-size: 0.75rem; color: rgba(255,255,255,0.5); margin: 0.35rem 0 0; }
  
  .bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(12,27,43,0.98); border-top: 1px solid rgba(255,255,255,0.08); padding: 0.5rem 1rem; z-index: 100; }
  .nav-link { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.4rem; color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.7rem; border-radius: 8px; border: none; background: none; cursor: pointer; }
  .nav-link svg { width: 20px; height: 20px; }
  .nav-link.active { color: var(--primary); }
  
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
  .modal { background: var(--bg); width: 100%; max-width: 500px; border-radius: 16px; max-height: 85vh; overflow-y: auto; position: relative; }
  .close { position: absolute; top: 1rem; right: 1rem; width: 32px; height: 32px; background: rgba(255,255,255,0.1); border: none; border-radius: 50%; color: #fff; font-size: 1.25rem; cursor: pointer; z-index: 10; }
  .modal-header { padding: 1.5rem 1.5rem 0; }
  .modal-body { padding: 0 1.5rem 1.5rem; }
  .modal-header h2 { font-size: 1.35rem; margin: 0.5rem 0 0.25rem; }
  .modal-header .lecturer { color: var(--primary); font-size: 1rem; margin: 0 0 0.5rem; }
  .tagline { color: rgba(255,255,255,0.6); margin: 0 0 1rem; }
  .about .card { display: block; padding: 1rem; margin-bottom: 0.75rem; }
  .about .card h3 { font-size: 1rem; color: var(--primary); margin: 0 0 0.5rem; }
  .about .card p { color: rgba(255,255,255,0.8); line-height: 1.5; margin-bottom: 0.5rem; font-size: 0.9rem; }
  .about .card strong { color: var(--primary); }
  .contact-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: var(--primary); border-radius: 8px; color: var(--bg); text-decoration: none; font-weight: 600; margin-top: 0.5rem; }
  
  .about-modal { background: #0d1e2d; width: 100%; max-width: 560px; border-radius: 24px; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
  .about-header { padding: 2rem 1.5rem 1.25rem; text-align: center; background: linear-gradient(180deg, rgba(255,138,4,0.08) 0%, transparent 100%); border-radius: 24px 24px 0 0; }
  .about-logo-wrap { width: 72px; height: 72px; margin: 0 auto 1rem; background: #fff; border-radius: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
  .about-logo-img { width: 56px; height: 56px; object-fit: contain; border-radius: 16px; }
  .about-header h2 { font-size: 1.75rem; margin: 0; font-weight: 700; letter-spacing: -0.5px; }
  .about-subtitle { color: rgba(255,255,255,0.5); margin: 0.5rem 0 0; font-size: 0.95rem; }
  .about-body { padding: 1.25rem 1.5rem; }
  .about-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 1.25rem; margin-bottom: 1rem; }
  .about-card:last-of-type { margin-bottom: 0; }
  .about-card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
  .about-card-icon { width: 36px; height: 36px; min-width: 36px; background: linear-gradient(135deg, rgba(255,138,4,0.2), rgba(255,138,4,0.05)); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .about-card-icon svg { width: 18px; height: 18px; color: var(--primary); }
  .about-card-header h3 { font-size: 1rem; margin: 0; font-weight: 600; color: #fff; }
  .about-card p { color: rgba(255,255,255,0.7); line-height: 1.6; margin: 0; font-size: 0.9rem; }
  .about-card strong { color: var(--primary); font-weight: 600; }
  .about-contact-btn { display: block; width: 100%; padding: 0.875rem; background: var(--primary); border-radius: 12px; color: #0c1b2b; text-decoration: none; font-weight: 600; margin-top: 1rem; text-align: center; font-size: 0.95rem; box-sizing: border-box; }
  .about-contact-btn:hover { background: #ff9d2e; }
  .about-footer { text-align: center; padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.06); }
  .about-footer p { margin: 0; color: rgba(255,255,255,0.4); font-size: 0.8rem; }
  .about-dua { color: var(--primary); margin-top: 0.25rem; font-weight: 500; }
  .about { color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 1rem; font-size: 0.95rem; }
  
  .details { background: rgba(255,255,255,0.03); border-radius: 10px; padding: 0.75rem 1rem; }
  .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .detail-row:last-child { border-bottom: none; }
  .detail-row .label { color: rgba(255,255,255,0.5); font-size: 0.85rem; }
  .detail-row span:last-child { font-weight: 500; }
  
  .links-section { margin-top: 1.25rem; }
  .links-section h4 { font-size: 0.75rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter: 0.5px; margin: 0 0 0.75rem; }
  .links { display: flex; flex-direction: column; gap: 0.5rem; }
  .link-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: rgba(255,138,0,0.1); border: 1px solid rgba(255,138,0,0.25); border-radius: 10px; color: #fff; text-decoration: none; font-weight: 500; transition: all 0.15s; }
  .link-btn:hover { background: rgba(255,138,0,0.15); }
  .link-btn .icon { font-size: 1.1rem; }
  
  .actions { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; padding: 1rem; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; font-size: 1rem; background: rgba(255,255,255,0.1); color: #fff; box-sizing: border-box; }
  .btn svg { width: 20px; height: 20px; }
  .btn.active { background: rgba(255,138,0,0.2); color: var(--primary); }
  .btn.active svg { color: var(--primary); }
  .btn.primary { background: var(--primary); color: var(--bg); }
  
  .load-more { display: block; width: calc(100% - 2rem); margin: 1rem auto; padding: 0.875rem; background: rgba(255,255,255,0.1); border: none; border-radius: 10px; color: #fff; font-size: 1rem; cursor: pointer; }
  .load-more:disabled { opacity: 0.5; }
  
  @media (max-width: 768px) {
    .modal-overlay { align-items: flex-end; }
    .modal, .about-modal { border-radius: 20px 20px 0 0; max-height: 85vh; }
    .filters { grid-template-columns: 1fr; }
    .filters select, .clear-btn { grid-column: span 1; }
  }
</style>