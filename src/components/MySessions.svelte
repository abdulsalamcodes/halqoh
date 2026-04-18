<script>
  import { onMount } from 'svelte'

  let { onNavigate = null } = $props()

  let savedIds = $state([])
  let sessions = $state([])
  let loading = $state(true)
  let error = $state(null)

  const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  async function fetchSavedSessions() {
    try {
      loading = true
      const saved = localStorage.getItem('savedSessions')
      savedIds = saved ? JSON.parse(saved) : []
      
      if (savedIds.length === 0) {
        sessions = []
        loading = false
        return
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/halqahs?status=eq.published`, {
        headers: { 'apikey': API_KEY, 'Authorization': 'Bearer ' + API_KEY }
      })
      const all = await response.json()
      sessions = all.filter(s => savedIds.includes(s.id))
    } catch (e) { error = e.message }
    finally { loading = false }
  }

  function removeSession(id) {
    savedIds = savedIds.filter(sid => sid !== id)
    sessions = sessions.filter(s => s.id !== id)
    localStorage.setItem('savedSessions', JSON.stringify(savedIds))
  }

  function getCategoryName(cat) {
    if (!cat) return 'General'
    try { return JSON.parse(cat).name || 'General' }
    catch { return 'General' }
  }

  function getDays(sched) {
    if (!sched?.recurring?.days) return ''
    return sched.recurring.days.map(d => days[d]).join(', ')
  }

  function getTime(sched) {
    if (!sched?.recurring) return ''
    return sched.recurring.start_time + ' - ' + sched.recurring.end_time
  }

  function getPlatformIcon(platform) {
    const icons = { telegram: 'Telegram', youtube: 'YouTube', facebook: 'Facebook' }
    return icons[platform?.toLowerCase()] || platform
  }

  onMount(() => {
    fetchSavedSessions()
  })
</script>

<div class="mysessions">
  <nav class="navbar">
    {#if onNavigate}
      <button class="icon-btn" onclick={() => onNavigate('landing')}>&#8592;</button>
    {:else}
      <a href="/" class="icon-btn">&#8592;</a>
    {/if}
    <img src="/images/Halqoh Logo.png" alt="Halqoh" class="logo" />
  </nav>

  <header class="hero">
    <h1>My Sessions</h1>
    <p>Saved knowledge sessions</p>
  </header>

  <main class="content">
    {#if loading}
      <div class="state"><div class="spinner"></div><p>Loading...</p></div>
    {:else if error}
      <div class="state"><p>{error}</p><button onclick={fetchSavedSessions}>Retry</button></div>
    {:else if sessions.length === 0}
      <div class="state">
        <div class="empty-icon">&#128218;</div>
        <h3>No saved sessions</h3>
        <p>Save sessions to see them here</p>
        <a href="/discover.html" class="btn">Discover Sessions</a>
      </div>
    {:else}
      <div class="cards">
        {#each sessions as halqah}
          <div class="card">
            <button class="remove" onclick={() => removeSession(halqah.id)}>×</button>
            <div class="card-img">&#128218;</div>
            <div class="card-body">
              <span class="tag">{getCategoryName(halqah.category)}</span>
              <h3>{halqah.title}</h3>
              <p class="lecturer">{halqah.lecturer}</p>
              <p class="meta">{getDays(halqah.schedule)} · {getTime(halqah.schedule)}</p>
              {#if halqah.schedule?.onlineLinks}
                <div class="links">
                  {#each halqah.schedule.onlineLinks.slice(0, 2) as link}
                    <a href={link.link} target="_blank" class="link">{getPlatformIcon(link.platform)}</a>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>

<nav class="bottom-nav">
    <a href="/" class="nav-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <span>Discover</span>
    </a>
    <a href="/mysessions.html" class="nav-link active">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>
      <span>Saved</span>
    </a>
    <a href="/about.html" class="nav-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      <span>About</span>
    </a>
  </nav>
</div>

<style>
  :root { --bg: #0c1b2b; --primary: #ff8a04; }
  .mysessions { min-height: 100vh; background: var(--bg); color: #fff; font-family: system-ui, sans-serif; padding-bottom: 70px; }
  
  .navbar { display: flex; align-items: center; padding: 0.75rem 1rem; background: rgba(12,27,43,0.95); }
  .logo { height: 32px; }
  .icon-btn { background: none; border: none; color: #fff; font-size: 1.25rem; cursor: pointer; padding: 0.5rem; text-decoration: none; }
  
  .hero { padding: 1rem; }
  .hero h1 { font-size: 1.5rem; margin: 0; }
  .hero p { color: rgba(255,255,255,0.6); margin: 0.25rem 0 0; }
  
  .content { padding: 0 1rem; }
  .state { text-align: center; padding: 3rem 1rem; color: rgba(255,255,255,0.6); }
  .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .state button, .btn { margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--primary); border: none; border-radius: 8px; color: var(--bg); cursor: pointer; text-decoration: none; display: inline-block; font-weight: 600; }
  .empty-icon { font-size: 3rem; margin-bottom: 0.5rem; }
  .state h3 { color: #fff; margin: 0 0 0.25rem; }
  
  .cards { display: flex; flex-direction: column; gap: 0.75rem; }
  .card { display: flex; gap: 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.75rem; position: relative; }
  .remove { position: absolute; top: 0.5rem; right: 0.5rem; width: 24px; height: 24px; background: rgba(255,0,0,0.3); border: none; border-radius: 50%; color: #fff; font-size: 0.9rem; cursor: pointer; }
  .card-img { width: 50px; height: 50px; background: linear-gradient(135deg, #1a3a5c, var(--bg)); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
  .card-body { flex: 1; min-width: 0; }
  .tag { display: inline-block; font-size: 0.6rem; padding: 0.15rem 0.4rem; background: rgba(255,138,0,15%); color: var(--primary); border-radius: 4px; }
  .card-body h3 { font-size: 0.95rem; margin: 0.35rem 0 0.2rem; }
  .lecturer { color: var(--primary); font-size: 0.8rem; margin: 0; }
  .meta { font-size: 0.75rem; color: rgba(255,255,255,0.5); margin: 0.35rem 0 0; }
  .links { display: flex; gap: 0.35rem; margin-top: 0.5rem; }
  .link { padding: 0.3rem 0.5rem; background: rgba(255,138,0,15%); color: var(--primary); border-radius: 4px; font-size: 0.7rem; text-decoration: none; }
  
  .bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(12,27,43,0.98); border-top: 1px solid rgba(255,255,255,0.08); padding: 0.5rem 1rem; z-index: 100; }
  .nav-link { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.4rem; color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.7rem; border-radius: 8px; }
  .nav-link svg { width: 20px; height: 20px; }
  .nav-link.active { color: var(--primary); }
  
  @media (max-width: 768px) {
    .bottom-nav { display: flex; }
    .content { padding-bottom: 5rem; }
  }
</style>