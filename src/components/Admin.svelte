<script>
  import { onMount } from 'svelte'

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin'
  const API_KEY        = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const SERVICE_KEY    = import.meta.env.VITE_SUPABASE_SERVICE_KEY || API_KEY
  const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL || ''

  const CATEGORIES = ['Quran Studies', 'Hadith Explanations', 'Islamic Law', 'Spirituality', 'Language', 'General']
  const LANGUAGES  = ['english', 'arabic', 'yoruba', 'hausa', 'french']
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  let authenticated  = $state(false)
  let password       = $state('')
  let loginError     = $state('')
  let sessions       = $state([])
  let loading        = $state(false)
  let saving         = $state(false)
  let errorMsg       = $state('')
  let successMsg     = $state('')
  let searchQuery    = $state('')
  let editing        = $state(null)   // null=list, 'new'=new form, object=edit form
  let deleteTarget   = $state(null)   // session to confirm-delete
  let statusFilter   = $state('all')  // 'all' | 'published' | 'draft'

  function emptyForm() {
    return {
      title: '', lecturer: '', status: 'draft',
      category: 'Quran Studies', subcategory: '',
      language: 'english', summary: '',
      days: [], start_time: '', end_time: '',
      mode: 'Online', platform: '', link: '',
    }
  }

  let form = $state(emptyForm())

  // ── Auth ──────────────────────────────────────────────
  function login() {
    loginError = ''
    if (password === ADMIN_PASSWORD) {
      authenticated = true
      sessionStorage.setItem('adminAuth', ADMIN_PASSWORD)
      fetchSessions()
    } else {
      loginError = 'Incorrect password. Try again.'
    }
  }

  function logout() {
    authenticated = false
    sessionStorage.removeItem('adminAuth')
    password = ''
  }

  onMount(() => {
    if (sessionStorage.getItem('adminAuth') === ADMIN_PASSWORD) {
      authenticated = true
      fetchSessions()
    }
  })

  // ── API helpers ───────────────────────────────────────
  function readHeaders() {
    return { 'apikey': API_KEY, 'Authorization': 'Bearer ' + API_KEY }
  }

  function writeHeaders() {
    return {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    }
  }

  async function fetchSessions() {
    loading = true; errorMsg = ''
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/halqahs?order=created_at.desc`,
        { headers: readHeaders() }
      )
      if (!res.ok) throw new Error('Failed to load sessions (HTTP ' + res.status + ')')
      sessions = await res.json()
    } catch (e) {
      errorMsg = e.message
    } finally {
      loading = false
    }
  }

  // ── Helpers ───────────────────────────────────────────
  function getCategoryName(cat) {
    if (!cat) return 'General'
    try { return JSON.parse(cat).name || 'General' } catch { return 'General' }
  }

  function buildPayload() {
    const sched = {
      mode: form.mode,
      recurring: { days: form.days, start_time: form.start_time, end_time: form.end_time },
    }
    if (form.link) sched.onlineLinks = [{ platform: form.platform || form.mode, link: form.link }]
    return {
      title: form.title.trim(),
      lecturer: form.lecturer.trim(),
      status: form.status,
      category: JSON.stringify({ name: form.category }),
      subcategory: form.subcategory.trim(),
      language: form.language,
      summary: form.summary.trim(),
      schedule: sched,
    }
  }

  function openNew() {
    form = emptyForm()
    editing = 'new'
    errorMsg = ''
  }

  function openEdit(s) {
    const rec   = s.schedule?.recurring || {}
    const links = s.schedule?.onlineLinks || []
    form = {
      title: s.title || '',
      lecturer: s.lecturer || '',
      status: s.status || 'draft',
      category: getCategoryName(s.category),
      subcategory: s.subcategory || '',
      language: s.language || 'english',
      summary: s.summary || s.about || '',
      days: rec.days || [],
      start_time: rec.start_time || '',
      end_time: rec.end_time || '',
      mode: s.schedule?.mode || 'Online',
      platform: links[0]?.platform || '',
      link: links[0]?.link || '',
    }
    editing = s
    errorMsg = ''
  }

  function toggleDay(d) {
    form.days = form.days.includes(d)
      ? form.days.filter(x => x !== d)
      : [...form.days, d].sort((a, b) => a - b)
  }

  function flash(msg) {
    successMsg = msg
    setTimeout(() => successMsg = '', 3000)
  }

  // ── CRUD ──────────────────────────────────────────────
  async function saveSession() {
    if (!form.title.trim()) { errorMsg = 'Title is required.'; return }
    saving = true; errorMsg = ''
    try {
      const isNew = editing === 'new'
      const url   = isNew
        ? `${SUPABASE_URL}/rest/v1/halqahs`
        : `${SUPABASE_URL}/rest/v1/halqahs?id=eq.${editing.id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: writeHeaders(),
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Save failed')
      }
      editing = null
      await fetchSessions()
      flash(isNew ? 'Session created!' : 'Session saved!')
    } catch (e) {
      errorMsg = e.message
    } finally {
      saving = false
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    saving = true; errorMsg = ''
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/halqahs?id=eq.${deleteTarget.id}`,
        { method: 'DELETE', headers: writeHeaders() }
      )
      if (!res.ok) throw new Error('Delete failed')
      deleteTarget = null
      editing = null
      await fetchSessions()
      flash('Session deleted.')
    } catch (e) {
      errorMsg = e.message
    } finally {
      saving = false
    }
  }

  async function quickToggleStatus(s, e) {
    e.stopPropagation()
    const next = s.status === 'published' ? 'draft' : 'published'
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/halqahs?id=eq.${s.id}`,
        { method: 'PATCH', headers: writeHeaders(), body: JSON.stringify({ status: next }) }
      )
      if (!res.ok) throw new Error('Update failed')
      sessions = sessions.map(x => x.id === s.id ? { ...x, status: next } : x)
    } catch (e) {
      errorMsg = e.message
    }
  }

  // ── Derived list ──────────────────────────────────────
  let displaySessions = $derived.by(() => {
    let list = sessions
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.lecturer?.toLowerCase().includes(q)
      )
    }
    return list
  })

  let counts = $derived.by(() => ({
    all: sessions.length,
    published: sessions.filter(s => s.status === 'published').length,
    draft: sessions.filter(s => s.status === 'draft').length,
  }))
</script>

<!-- ── LOGIN ──────────────────────────────────────────── -->
{#if !authenticated}
  <div class="login-wrap">
    <div class="login-card">
      <img src="/images/Halqoh Logo.png" alt="Halqah" class="login-logo" />
      <h1 class="login-title">Admin</h1>
      <p class="login-sub">Enter your password to continue</p>
      <form onsubmit={(e) => { e.preventDefault(); login() }}>
        <input
          class="field"
          type="password"
          placeholder="Password"
          bind:value={password}
          autofocus
        />
        {#if loginError}
          <p class="form-error">{loginError}</p>
        {/if}
        <button class="btn-primary" type="submit">Sign in</button>
      </form>
    </div>
  </div>

<!-- ── DELETE CONFIRM ─────────────────────────────────── -->
{:else if deleteTarget}
  <div class="overlay" onclick={() => deleteTarget = null}>
    <div class="confirm-card" onclick={(e) => e.stopPropagation()}>
      <p class="confirm-title">Delete session?</p>
      <p class="confirm-body">"{deleteTarget.title}" will be permanently removed. This cannot be undone.</p>
      <div class="confirm-actions">
        <button class="btn-ghost" onclick={() => deleteTarget = null} disabled={saving}>Cancel</button>
        <button class="btn-danger" onclick={confirmDelete} disabled={saving}>
          {saving ? 'Deleting…' : 'Yes, delete'}
        </button>
      </div>
    </div>
  </div>

<!-- ── EDIT / NEW FORM ────────────────────────────────── -->
{:else if editing !== null}
  <div class="page">
    <header class="page-header">
      <button class="back-btn" onclick={() => { editing = null; errorMsg = '' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back
      </button>
      <h1 class="page-title">{editing === 'new' ? 'New Session' : 'Edit Session'}</h1>
      {#if editing !== 'new'}
        <button class="btn-danger-sm" onclick={() => deleteTarget = editing}>Delete</button>
      {:else}
        <span></span>
      {/if}
    </header>

    <div class="form-wrap">
      {#if errorMsg}
        <div class="alert alert-error">{errorMsg}</div>
      {/if}

      <!-- Status toggle -->
      <div class="status-toggle-row">
        <span class="field-label">Status</span>
        <button
          class="status-toggle"
          class:published={form.status === 'published'}
          onclick={() => form.status = form.status === 'published' ? 'draft' : 'published'}
        >
          <span class="toggle-dot"></span>
          <span>{form.status === 'published' ? 'Published' : 'Draft'}</span>
        </button>
      </div>

      <div class="field-group">
        <label class="field-label" for="f-title">Session Title <span class="req">*</span></label>
        <input id="f-title" class="field" type="text" placeholder="e.g. Tafsir of Surah Al-Baqarah" bind:value={form.title} />
      </div>

      <div class="field-group">
        <label class="field-label" for="f-lecturer">Lecturer / Sheikh</label>
        <input id="f-lecturer" class="field" type="text" placeholder="e.g. Sheikh Ahmad Ibrahim" bind:value={form.lecturer} />
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-cat">Category</label>
          <select id="f-cat" class="field" bind:value={form.category}>
            {#each CATEGORIES as c}<option value={c}>{c}</option>{/each}
          </select>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-lang">Language</label>
          <select id="f-lang" class="field" bind:value={form.language}>
            {#each LANGUAGES as l}<option value={l} style="text-transform:capitalize">{l.charAt(0).toUpperCase()+l.slice(1)}</option>{/each}
          </select>
        </div>
      </div>

      <div class="field-group">
        <label class="field-label" for="f-sub">Topic / Subcategory</label>
        <input id="f-sub" class="field" type="text" placeholder="e.g. Stories of the Prophets" bind:value={form.subcategory} />
      </div>

      <div class="field-group">
        <label class="field-label" for="f-summary">Description</label>
        <textarea id="f-summary" class="field textarea" rows="3" placeholder="Short description of the session…" bind:value={form.summary}></textarea>
      </div>

      <div class="section-divider">Schedule</div>

      <div class="field-group">
        <span class="field-label">Days</span>
        <div class="day-chips">
          {#each DAY_LABELS as label, i}
            <button
              type="button"
              class="day-chip"
              class:active={form.days.includes(i)}
              onclick={() => toggleDay(i)}
            >{label}</button>
          {/each}
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-start">Start Time</label>
          <input id="f-start" class="field" type="time" bind:value={form.start_time} />
        </div>
        <div class="field-group">
          <label class="field-label" for="f-end">End Time</label>
          <input id="f-end" class="field" type="time" bind:value={form.end_time} />
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-mode">Mode</label>
          <select id="f-mode" class="field" bind:value={form.mode}>
            <option>Online</option>
            <option>In-person</option>
            <option>Hybrid</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-platform">Platform</label>
          <input id="f-platform" class="field" type="text" placeholder="e.g. Zoom, Google Meet" bind:value={form.platform} />
        </div>
      </div>

      <div class="field-group">
        <label class="field-label" for="f-link">Join Link</label>
        <input id="f-link" class="field" type="url" placeholder="https://…" bind:value={form.link} />
      </div>

      <div class="form-actions">
        <button class="btn-ghost" onclick={() => { editing = null; errorMsg = '' }} disabled={saving}>Cancel</button>
        <button class="btn-primary" onclick={saveSession} disabled={saving}>
          {saving ? 'Saving…' : (editing === 'new' ? 'Create Session' : 'Save Changes')}
        </button>
      </div>
    </div>
  </div>

<!-- ── SESSION LIST ───────────────────────────────────── -->
{:else}
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">Sessions</h1>
      <div class="header-actions">
        <button class="btn-ghost-sm" onclick={logout} title="Sign out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
        <button class="btn-primary-sm" onclick={openNew}>+ New</button>
      </div>
    </header>

    {#if successMsg}
      <div class="toast">{successMsg}</div>
    {/if}
    {#if errorMsg}
      <div class="alert alert-error" style="margin:0 1rem 1rem">{errorMsg}</div>
    {/if}

    <div class="list-controls">
      <input class="field search-field" type="search" placeholder="Search title or lecturer…" bind:value={searchQuery} />
      <div class="tab-row">
        <button class="tab" class:active={statusFilter==='all'} onclick={() => statusFilter='all'}>All <span class="tab-count">{counts.all}</span></button>
        <button class="tab" class:active={statusFilter==='published'} onclick={() => statusFilter='published'}>Published <span class="tab-count">{counts.published}</span></button>
        <button class="tab" class:active={statusFilter==='draft'} onclick={() => statusFilter='draft'}>Drafts <span class="tab-count">{counts.draft}</span></button>
      </div>
    </div>

    {#if loading}
      <div class="loading-wrap">
        <div class="spinner"></div>
        <p>Loading sessions…</p>
      </div>
    {:else if displaySessions.length === 0}
      <div class="empty">
        <p>{searchQuery || statusFilter !== 'all' ? 'No sessions match.' : 'No sessions yet.'}</p>
        {#if !searchQuery && statusFilter === 'all'}
          <button class="btn-primary" onclick={openNew}>Create your first session</button>
        {/if}
      </div>
    {:else}
      <ul class="session-list">
        {#each displaySessions as s}
          <li class="session-row" onclick={() => openEdit(s)} role="button" tabindex="0" onkeydown={(e) => e.key==='Enter' && openEdit(s)}>
            <div class="session-info">
              <p class="session-title">{s.title}</p>
              {#if s.lecturer}
                <p class="session-lecturer">{s.lecturer}</p>
              {/if}
              {#if s.schedule?.recurring?.days?.length}
                <p class="session-meta">
                  {s.schedule.recurring.days.map(d => DAY_LABELS[d]).join(' · ')}
                  {#if s.schedule.recurring.start_time}
                    · {s.schedule.recurring.start_time}
                  {/if}
                </p>
              {/if}
            </div>
            <div class="session-right" onclick={(e) => e.stopPropagation()}>
              <button
                class="status-pill"
                class:published={s.status === 'published'}
                onclick={(e) => quickToggleStatus(s, e)}
                title="Click to toggle status"
              >
                {s.status === 'published' ? 'Live' : 'Draft'}
              </button>
              <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  /* ── Base ── */
  .page {
    max-width: 640px;
    margin: 0 auto;
    min-height: 100vh;
    padding-bottom: 3rem;
  }

  /* ── Login ── */
  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .login-card {
    width: 100%;
    max-width: 360px;
    background: var(--ink-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2.5rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .login-logo {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    margin-bottom: 0.25rem;
  }
  .login-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--cream);
    margin: 0;
  }
  .login-sub {
    font-size: 0.85rem;
    color: rgba(237,229,216,0.5);
    margin: 0 0 0.5rem;
  }
  .form-error {
    font-size: 0.8rem;
    color: #f87171;
    margin: 0;
  }

  /* ── Header ── */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1rem 0.75rem;
    position: sticky;
    top: 0;
    background: var(--ink);
    z-index: 10;
    border-bottom: 1px solid var(--border);
  }
  .page-title {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--cream);
    margin: 0;
  }
  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .back-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: none;
    border: none;
    color: var(--sage);
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.25rem 0;
  }
  .back-btn svg {
    width: 18px;
    height: 18px;
  }

  /* ── Controls ── */
  .list-controls {
    padding: 0.75rem 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .search-field { background: var(--ink-2) !important; }
  .tab-row {
    display: flex;
    gap: 0.25rem;
  }
  .tab {
    background: none;
    border: none;
    color: rgba(237,229,216,0.5);
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.35rem 0.6rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .tab.active {
    background: var(--gold-dim);
    color: var(--gold-lt);
  }
  .tab-count {
    background: rgba(237,229,216,0.1);
    border-radius: 999px;
    padding: 0 5px;
    font-size: 0.7rem;
    margin-left: 3px;
  }

  /* ── Session list ── */
  .session-list {
    list-style: none;
    margin: 0.75rem 0 0;
    padding: 0 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .session-row {
    background: var(--ink-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.9rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .session-row:hover {
    border-color: rgba(237,229,216,0.18);
    background: var(--ink-2);
  }
  .session-info { flex: 1; min-width: 0; }
  .session-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--cream);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .session-lecturer {
    font-size: 0.78rem;
    color: var(--sage);
    margin: 2px 0 0;
  }
  .session-meta {
    font-size: 0.72rem;
    color: rgba(237,229,216,0.4);
    margin: 3px 0 0;
  }
  .session-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .chevron {
    width: 16px;
    height: 16px;
    color: rgba(237,229,216,0.25);
  }
  .status-pill {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    background: rgba(237,229,216,0.08);
    color: rgba(237,229,216,0.45);
    transition: background 0.15s, color 0.15s;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .status-pill.published {
    background: rgba(75,191,173,0.15);
    color: var(--sage);
  }

  /* ── Form ── */
  .form-wrap {
    padding: 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .section-divider {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(237,229,216,0.35);
    padding: 0.5rem 0 0;
    border-top: 1px solid var(--border);
  }
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .field-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: rgba(237,229,216,0.6);
  }
  .req { color: #f87171; }
  .field {
    width: 100%;
    background: var(--ink-1);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--cream);
    font-size: 0.9rem;
    padding: 0.65rem 0.85rem;
    outline: none;
    transition: border-color 0.15s;
    appearance: none;
    -webkit-appearance: none;
  }
  .field:focus { border-color: var(--gold); }
  .field::placeholder { color: rgba(237,229,216,0.25); }
  .textarea {
    resize: vertical;
    min-height: 80px;
    line-height: 1.5;
  }
  select.field {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ede5d8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 16px;
    padding-right: 2.5rem;
  }
  input[type="time"].field { color-scheme: dark; }

  /* ── Days ── */
  .day-chips {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .day-chip {
    background: var(--ink-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: rgba(237,229,216,0.55);
    font-size: 0.78rem;
    font-weight: 500;
    padding: 0.4rem 0.65rem;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .day-chip.active {
    background: var(--gold-dim);
    border-color: var(--gold);
    color: var(--gold-lt);
  }

  /* ── Status toggle ── */
  .status-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--ink-1);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
  }
  .status-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(237,229,216,0.06);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.3rem 0.75rem 0.3rem 0.4rem;
    color: rgba(237,229,216,0.5);
    font-size: 0.8rem;
    font-weight: 600;
    transition: background 0.2s, color 0.2s, border-color 0.2s;
  }
  .status-toggle.published {
    background: rgba(75,191,173,0.15);
    border-color: var(--sage);
    color: var(--sage);
  }
  .toggle-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    transition: background 0.2s;
  }

  /* ── Buttons ── */
  .btn-primary {
    width: 100%;
    background: var(--gold);
    color: var(--ink);
    border: none;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 600;
    padding: 0.85rem;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-primary:hover:not(:disabled) { opacity: 0.9; }
  .btn-primary-sm {
    background: var(--gold);
    color: var(--ink);
    border: none;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.4rem 0.85rem;
    cursor: pointer;
  }
  .btn-ghost {
    background: none;
    border: 1px solid var(--border);
    border-radius: 10px;
    color: rgba(237,229,216,0.6);
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.75rem 1.25rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    flex: 1;
  }
  .btn-ghost:hover:not(:disabled) {
    border-color: rgba(237,229,216,0.3);
    color: var(--cream);
  }
  .btn-ghost-sm {
    background: none;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: rgba(237,229,216,0.5);
    padding: 0.4rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .btn-danger {
    flex: 1;
    background: rgba(248,113,113,0.15);
    border: 1px solid rgba(248,113,113,0.4);
    border-radius: 10px;
    color: #f87171;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.75rem 1.25rem;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-danger:hover:not(:disabled) { background: rgba(248,113,113,0.25); }
  .btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-danger-sm {
    background: rgba(248,113,113,0.12);
    border: 1px solid rgba(248,113,113,0.3);
    border-radius: 8px;
    color: #f87171;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.35rem 0.75rem;
    cursor: pointer;
  }
  .form-actions {
    display: flex;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }

  /* ── Toast / Alerts ── */
  .toast {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    background: var(--sage);
    color: var(--ink);
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.65rem 1.25rem;
    border-radius: 999px;
    z-index: 100;
    white-space: nowrap;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }
  .alert {
    border-radius: 10px;
    padding: 0.7rem 0.9rem;
    font-size: 0.82rem;
  }
  .alert-error {
    background: rgba(248,113,113,0.12);
    border: 1px solid rgba(248,113,113,0.3);
    color: #fca5a5;
  }

  /* ── Confirm dialog ── */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(7,16,28,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    z-index: 50;
  }
  .confirm-card {
    background: var(--ink-1);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.75rem 1.5rem;
    max-width: 360px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .confirm-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--cream);
    margin: 0;
  }
  .confirm-body {
    font-size: 0.85rem;
    color: rgba(237,229,216,0.6);
    margin: 0;
    line-height: 1.5;
  }
  .confirm-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.25rem;
  }

  /* ── Empty / loading ── */
  .empty, .loading-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 4rem 1rem;
    color: rgba(237,229,216,0.4);
    font-size: 0.9rem;
  }
  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid rgba(237,229,216,0.1);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
