<script>
  import { onMount } from 'svelte'

  const API_KEY    = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

  const GRID_START  = 6    // 6 am
  const GRID_END    = 23   // 11 pm
  const HOUR_H      = 64   // px per hour
  const HOURS       = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => i + GRID_START)
  const GRID_H      = (GRID_END - GRID_START + 1) * HOUR_H  // total grid px
  const SWIPE_THRESHOLD = 55

  const CAT_COLOR = {
    'Quran Studies':       '#4ADE80',
    'Hadith Explanations': '#60A5FA',
    'Islamic Law':         '#A78BFA',
    'Spirituality':        '#F59E0B',
    'Language':            '#F472B6',
    'General':             '#94A3B8',
  }

  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // ── State ──────────────────────────────────────────────────
  let halqahs        = $state([])
  let loading        = $state(true)
  let currentDate    = $state(new Date())
  let now            = $state(new Date())
  let scrollEl       = $state(null)
  let selectedSession = $state(null)

  // Swipe state (plain vars, not reactive — only dragOffset drives the UI)
  let pStartX = 0, pStartY = 0
  let isDragging = false, swipeDetected = false
  let dragOffset   = $state(0)
  let isAnimating  = $state(false)

  // ── Data ───────────────────────────────────────────────────
  async function fetchHalqahs() {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/halqahs?status=eq.published&order=created_at.desc`,
        { headers: { apikey: API_KEY, Authorization: 'Bearer ' + API_KEY } }
      )
      if (!res.ok) throw new Error('HTTP ' + res.status)
      halqahs = await res.json()
    } catch (e) {
      console.error('Calendar fetch error:', e)
    } finally {
      loading = false
    }
  }

  // ── Helpers ────────────────────────────────────────────────
  function getCategoryName(cat) {
    if (!cat) return 'General'
    try { return JSON.parse(cat).name || 'General' } catch { return 'General' }
  }

  function catColor(cat) { return CAT_COLOR[cat] || CAT_COLOR['General'] }

  function hexToRgba(hex, alpha) {
    if (!hex || hex.length < 7) return `rgba(148,163,184,${alpha})`
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  function parseHours(t) {
    if (!t) return null
    const [h, m = 0] = t.split(':').map(Number)
    return h + m / 60
  }

  function fmtHour(h) {
    if (h === 0 || h === 24) return '12am'
    if (h === 12) return '12pm'
    return h < 12 ? `${h}am` : `${h - 12}pm`
  }

  function fmtTime(t) {
    if (!t) return ''
    const [h, m = 0] = t.split(':').map(Number)
    const ampm = h < 12 ? 'am' : 'pm'
    const hr   = h % 12 || 12
    return m ? `${hr}:${String(m).padStart(2, '0')}${ampm}` : `${hr}${ampm}`
  }

  function getDaysFull(sched) {
    const DAY_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    if (!sched?.recurring?.days) return ''
    return sched.recurring.days.map(d => DAY_FULL[d]).join(', ')
  }

  function fmtDuration(start, end) {
    const s = parseHours(start), e = parseHours(end)
    if (s === null || e === null) return ''
    const mins = Math.round((e - s) * 60)
    if (mins <= 0) return ''
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60), m = mins % 60
    return m ? `${h}h ${m}m` : `${h}h`
  }

  function isToday(d) {
    const t = new Date()
    return d.getFullYear() === t.getFullYear() &&
           d.getMonth()    === t.getMonth()    &&
           d.getDate()     === t.getDate()
  }

  function fmtHeader(d) {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  // ── Derived ────────────────────────────────────────────────
  let dayIndex = $derived(currentDate.getDay())

  let sessionsForDay = $derived.by(() => {
    return halqahs
      .filter(h =>
        (h.schedule?.recurring?.days || []).includes(dayIndex) &&
        h.schedule?.recurring?.start_time
      )
      .sort((a, b) =>
        (parseHours(a.schedule.recurring.start_time) || 0) -
        (parseHours(b.schedule.recurring.start_time) || 0)
      )
  })

  // ── Overlap layout ─────────────────────────────────────────
  // Assigns each session a column index + total columns so overlapping
  // events sit side-by-side instead of stacking on top of each other.
  let layout = $derived.by(() => {
    const events = sessionsForDay
      .map(s => {
        const start  = parseHours(s.schedule?.recurring?.start_time)
        const endRaw = parseHours(s.schedule?.recurring?.end_time)
        const end    = (endRaw !== null && endRaw > start) ? endRaw : start + 0.75
        return { session: s, start, end, col: 0, totalCols: 1 }
      })
      .filter(e => e.start !== null && e.start >= GRID_START && e.start <= GRID_END)

    // Greedily assign columns
    const colEnds = []
    for (const ev of events) {
      let placed = false
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= ev.start) {
          ev.col = c
          colEnds[c] = ev.end
          placed = true
          break
        }
      }
      if (!placed) {
        ev.col = colEnds.length
        colEnds.push(ev.end)
      }
    }

    // For each event, find the max column index among all events it overlaps with
    for (const ev of events) {
      let maxCol = ev.col
      for (const other of events) {
        if (other === ev) continue
        if (other.start < ev.end && other.end > ev.start) {
          maxCol = Math.max(maxCol, other.col)
        }
      }
      ev.totalCols = maxCol + 1
    }

    return events
  })

  let nowLineStyle = $derived.by(() => {
    if (!isToday(currentDate)) return null
    const h = now.getHours() + now.getMinutes() / 60
    if (h < GRID_START || h > GRID_END) return null
    return `top:${(h - GRID_START) * HOUR_H}px`
  })

  // ── Event positioning ──────────────────────────────────────
  // GAP between side-by-side columns in px
  const COL_GAP = 3

  function eventStyle(ev) {
    const duration = ev.end - ev.start
    const top    = Math.round((ev.start - GRID_START) * HOUR_H)
    const height = Math.max(Math.round(duration * HOUR_H), 36)
    const short  = height < 46
    const n = ev.totalCols, c = ev.col
    // math: left = c*(W+gap)/n, width = (W - gap*(n-1))/n  where W=100%
    const left  = n > 1 ? `calc(${c} * (100% + ${COL_GAP}px) / ${n})` : '0%'
    const width = n > 1 ? `calc((100% - ${COL_GAP * (n - 1)}px) / ${n})` : '100%'
    return { top, height, short, left, width }
  }

  // ── Navigation ─────────────────────────────────────────────
  function shiftDay(delta) {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta)
    currentDate = d
  }

  function goToday() { currentDate = new Date() }

  function prevDay() { shiftDay(-1) }
  function nextDay() { shiftDay(+1) }

  // ── Auto-scroll ────────────────────────────────────────────
  function scrollToTime() {
    if (!scrollEl) return
    requestAnimationFrame(() => {
      const sessions = sessionsForDay
      let targetH
      if (sessions.length > 0) {
        const first = parseHours(sessions[0].schedule?.recurring?.start_time)
        targetH = first !== null ? first - 0.75 : null
      }
      if (targetH === null && isToday(currentDate)) {
        const n = new Date()
        targetH = n.getHours() + n.getMinutes() / 60 - 0.75
      }
      if (targetH !== null) {
        const top = Math.max(0, (targetH - GRID_START) * HOUR_H)
        scrollEl.scrollTo({ top, behavior: 'smooth' })
      }
    })
  }

  // Re-scroll whenever day changes
  $effect(() => {
    currentDate   // track dependency
    scrollToTime()
  })

  // ── Swipe gesture ──────────────────────────────────────────
  function onPtrDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pStartX = e.clientX
    pStartY = e.clientY
    isDragging    = true
    swipeDetected = false
    dragOffset    = 0
    isAnimating   = false
  }

  function onPtrMove(e) {
    if (!isDragging || isAnimating) return
    const dx = e.clientX - pStartX
    const dy = e.clientY - pStartY

    if (!swipeDetected) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      if (Math.abs(dx) > Math.abs(dy)) {
        swipeDetected = true
        e.currentTarget.setPointerCapture(e.pointerId)
      } else {
        isDragging = false   // let browser scroll vertically
        return
      }
    }
    dragOffset = dx
  }

  function onPtrUp(e) {
    if (!isDragging) return
    isDragging = false
    if (!swipeDetected) return
    swipeDetected = false

    const dx = e.clientX - pStartX
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const W = window.innerWidth
      // Slide current content off-screen
      isAnimating = true
      dragOffset  = dx < 0 ? -W : W
      setTimeout(() => {
        isAnimating = false
        dx < 0 ? nextDay() : prevDay()
        // Snap opposite side instantly, then slide to centre
        dragOffset = dx < 0 ? W : -W
        requestAnimationFrame(() => {
          isAnimating = true
          dragOffset  = 0
          setTimeout(() => { isAnimating = false }, 280)
        })
      }, 230)
    } else {
      // Snap back
      isAnimating = true
      dragOffset  = 0
      setTimeout(() => { isAnimating = false }, 200)
    }
  }

  function onPtrCancel() {
    isDragging = swipeDetected = false
    isAnimating = true
    dragOffset  = 0
    setTimeout(() => { isAnimating = false }, 200)
  }

  // ── Mount ──────────────────────────────────────────────────
  onMount(() => {
    fetchHalqahs()
    const tick = setInterval(() => { now = new Date() }, 60_000)
    return () => clearInterval(tick)
  })
</script>

<!-- ── BOTTOM NAV ─────────────────────────────────────────── -->
<nav class="bottom-nav" aria-label="Main navigation">
  <a href="/" class="bnav-item">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
    <span>Discover</span>
  </a>
  <a href="/calendar.html" class="bnav-item active" aria-current="page">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
    <span>Calendar</span>
  </a>
  <a href="/mysessions.html" class="bnav-item">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
    </svg>
    <span>Saved</span>
  </a>
</nav>

<!-- ── DAY HEADER ─────────────────────────────────────────── -->
<header class="day-header">
  <button class="arrow-btn" onclick={prevDay} aria-label="Previous day">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  </button>

  <div class="header-centre">
    <p class="header-date">{fmtHeader(currentDate)}</p>
    {#if !isToday(currentDate)}
      <button class="today-chip" onclick={goToday}>Back to today</button>
    {/if}
  </div>

  <button class="arrow-btn" onclick={nextDay} aria-label="Next day">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  </button>
</header>

<!-- ── WEEK STRIP ─────────────────────────────────────────── -->
<div class="week-strip">
  {#each DAY_SHORT as label, i}
    {@const d = new Date(currentDate)}
    {@const _ = d.setDate(d.getDate() - currentDate.getDay() + i)}
    {@const isActive = i === currentDate.getDay()}
    {@const isTod = isToday(d)}
    <button
      class="week-day"
      class:active={isActive}
      class:today={isTod}
      onclick={() => { const nd = new Date(currentDate); nd.setDate(nd.getDate() - currentDate.getDay() + i); currentDate = nd }}
    >
      <span class="wd-label">{label}</span>
      <span class="wd-dot-wrap">
        {#if isTod}<span class="wd-today-dot"></span>{/if}
      </span>
    </button>
  {/each}
</div>

<!-- ── CALENDAR AREA ──────────────────────────────────────── -->
<div
  class="cal-outer"
  onpointerdown={onPtrDown}
  onpointermove={onPtrMove}
  onpointerup={onPtrUp}
  onpointercancel={onPtrCancel}
>
  <div
    class="cal-slide"
    style="transform:translateX({dragOffset}px);{isAnimating ? 'transition:transform .26s cubic-bezier(.25,1,.5,1);' : ''}"
    bind:this={scrollEl}
  >

    <!-- Loading skeleton -->
    {#if loading}
      <div class="skel-wrap">
        {#each {length: 3} as _, i}
          <div class="skel-event" style="top:{80 + i * 160}px; height:{90 + (i % 2) * 30}px; opacity:{1 - i * 0.2}"></div>
        {/each}
        <div class="skel-axis">
          {#each {length: 6} as _, i}
            <div class="skel-hour" style="top:{i * 96}px"></div>
          {/each}
        </div>
      </div>

    <!-- Empty state -->
    {:else if sessionsForDay.length === 0}
      <div class="empty-day">
        <div class="empty-moon">☽</div>
        <p class="empty-title">No sessions today</p>
        <p class="empty-sub">Swipe left or right to explore other days</p>
        <div class="empty-days">
          {#each DAY_SHORT as label, i}
            {@const nd = new Date(currentDate)}
            {@const _ = nd.setDate(nd.getDate() - currentDate.getDay() + i)}
            {@const count = halqahs.filter(h => (h.schedule?.recurring?.days || []).includes(i)).length}
            {#if count > 0}
              <button
                class="empty-day-chip"
                onclick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - currentDate.getDay() + i); currentDate = d }}
              >
                {label} <span class="chip-count">{count}</span>
              </button>
            {/if}
          {/each}
        </div>
      </div>

    <!-- Time grid -->
    {:else}
      <div class="time-grid" style="height:{GRID_H}px">

        <!-- Hour lines -->
        {#each HOURS as hour}
          <div class="hour-row" style="top:{(hour - GRID_START) * HOUR_H}px">
            <span class="hour-lbl">{fmtHour(hour)}</span>
            <span class="hour-line"></span>
          </div>
        {/each}

        <!-- Now indicator -->
        {#if nowLineStyle}
          <div class="now-line" style={nowLineStyle}>
            <span class="now-dot"></span>
            <span class="now-bar"></span>
          </div>
        {/if}

        <!-- Events -->
        <div class="events-container">
          {#each layout as ev}
            {@const style = eventStyle(ev)}
            {@const cat   = getCategoryName(ev.session.category)}
            {@const col   = catColor(cat)}
            {@const bg    = hexToRgba(col, 0.14)}
            <div
              class="event-block"
              class:event-short={style.short}
              style="top:{style.top}px; height:{style.height}px; left:{style.left}; width:{style.width}; border-left-color:{col}; background:{bg}"
              onclick={() => selectedSession = ev.session}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && (selectedSession = ev.session)}
            >
              <p class="ev-title">{ev.session.title}</p>
              {#if !style.short}
                <p class="ev-meta">
                  {fmtTime(ev.session.schedule.recurring.start_time)}
                  {#if ev.session.schedule.recurring.end_time}
                    · {fmtDuration(ev.session.schedule.recurring.start_time, ev.session.schedule.recurring.end_time)}
                  {/if}
                </p>
              {/if}
            </div>
          {/each}
        </div>

      </div>
    {/if}
  </div>
</div>

<!-- ── SESSION DETAIL MODAL ──────────────────────────────── -->
{#if selectedSession}
  {@const cat   = getCategoryName(selectedSession.category)}
  {@const col   = catColor(cat)}
  {@const bg    = hexToRgba(col, 0.08)}
  <div class="overlay" onclick={() => selectedSession = null} onkeydown={(e) => e.key === 'Escape' && (selectedSession = null)} role="dialog" aria-modal="true" aria-label="Session details" tabindex="-1">
    <div class="sheet" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
      <div class="sheet-handle" aria-hidden="true"></div>
      <button class="sheet-close" onclick={() => selectedSession = null} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      <div class="sheet-header" style="background:linear-gradient(180deg,{bg},transparent)">
        <span class="cat-tag" style="color:{col}; background:{hexToRgba(col, 0.13)}">{cat}</span>
        <h2 class="sheet-title">{selectedSession.title}</h2>
        {#if selectedSession.lecturer}
          <p class="sheet-lecturer">{selectedSession.lecturer}</p>
        {/if}
      </div>

      <div class="sheet-body">
        {#if selectedSession.summary || selectedSession.about}
          <p class="sheet-summary">{selectedSession.summary || selectedSession.about}</p>
        {/if}

        <div class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">Days</span>
            <span class="detail-val">{getDaysFull(selectedSession.schedule) || '—'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time</span>
            <span class="detail-val">
              {fmtTime(selectedSession.schedule?.recurring?.start_time) || '—'}
              {#if selectedSession.schedule?.recurring?.end_time}
                – {fmtTime(selectedSession.schedule.recurring.end_time)}
                <span class="dur-chip">{fmtDuration(selectedSession.schedule.recurring.start_time, selectedSession.schedule.recurring.end_time)}</span>
              {/if}
            </span>
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
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Layout shell ── */
  :global(body) {
    overflow: hidden;
    height: 100dvh;
  }
  :global(#app) {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    overflow: hidden;
    background: var(--ink);
  }

  /* ── Bottom nav (matches other pages) ── */
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: .875rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(10,18,32,.94);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(237,229,216,.07);
    border-radius: 999px;
    padding: .5rem .75rem;
    gap: .25rem;
    box-shadow: 0 8px 40px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.04);
    z-index: 100;
  }
  .bnav-item {
    display: flex; flex-direction: column; align-items: center;
    gap: .18rem; padding: .4rem .875rem; border-radius: 40px;
    font-family: 'Sora', system-ui, sans-serif;
    font-size: .62rem; font-weight: 500;
    color: rgba(237,229,216,.35);
    text-decoration: none; border: none; background: none;
    cursor: pointer; transition: color .2s, background .2s;
  }
  .bnav-item svg { width: 19px; height: 19px; transition: transform .2s; }
  .bnav-item:hover,
  .bnav-item.active { color: var(--gold); background: var(--gold-dim); }
  .bnav-item.active svg { transform: scale(1.1); }

  /* ── Day header ── */
  .day-header {
    display: flex;
    align-items: center;
    padding: 1rem 0.5rem 0.5rem;
    gap: 0.25rem;
    flex-shrink: 0;
  }
  .header-centre {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  .header-date {
    font-size: 1rem;
    font-weight: 600;
    color: var(--cream);
    margin: 0;
    text-align: center;
    letter-spacing: -0.01em;
  }
  .today-chip {
    background: var(--gold-dim);
    border: 1px solid rgba(200,146,42,.3);
    border-radius: 999px;
    color: var(--gold-lt);
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.2rem 0.65rem;
    cursor: pointer;
    font-family: 'Sora', system-ui, sans-serif;
  }
  .arrow-btn {
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    background: none; border: none;
    color: rgba(237,229,216,.45);
    cursor: pointer; border-radius: 10px;
    transition: color .15s, background .15s;
    flex-shrink: 0;
  }
  .arrow-btn svg { width: 20px; height: 20px; }
  .arrow-btn:hover { color: var(--cream); background: rgba(237,229,216,.06); }

  /* ── Week strip ── */
  .week-strip {
    display: flex;
    justify-content: space-around;
    padding: 0 0.75rem 0.5rem;
    flex-shrink: 0;
  }
  .week-day {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: none; border: none; cursor: pointer;
    padding: 0.3rem 0.5rem; border-radius: 10px;
    font-family: 'Sora', system-ui, sans-serif;
    font-size: 0.7rem; font-weight: 500;
    color: rgba(237,229,216,.35);
    transition: color .15s, background .15s;
    min-width: 36px;
  }
  .week-day:hover { color: var(--cream); background: rgba(237,229,216,.06); }
  .week-day.active { color: var(--gold); background: var(--gold-dim); }
  .wd-label { line-height: 1; }
  .wd-dot-wrap { height: 5px; display: flex; align-items: center; justify-content: center; }
  .wd-today-dot {
    width: 4px; height: 4px; border-radius: 50%;
    background: var(--sage);
  }
  .week-day.active .wd-today-dot { background: var(--gold); }

  /* ── Calendar outer (swipe container) ── */
  .cal-outer {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    position: relative;
    cursor: grab;
    user-select: none;
  }
  .cal-outer:active { cursor: grabbing; }

  /* ── Calendar slide (scrollable) ── */
  .cal-slide {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    will-change: transform;
    /* Space for the fixed bottom nav */
    padding-bottom: 90px;
  }
  .cal-slide::-webkit-scrollbar { width: 3px; }
  .cal-slide::-webkit-scrollbar-track { background: transparent; }
  .cal-slide::-webkit-scrollbar-thumb { background: rgba(237,229,216,.1); border-radius: 3px; }

  /* ── Time grid ── */
  .time-grid {
    position: relative;
    padding-left: 52px;
    padding-right: 8px;
    padding-top: 8px;
  }

  .hour-row {
    position: absolute;
    left: 0;
    right: 8px;
    display: flex;
    align-items: flex-start;
    pointer-events: none;
  }
  .hour-lbl {
    width: 44px;
    text-align: right;
    padding-right: 8px;
    font-size: 0.67rem;
    color: rgba(237,229,216,.28);
    line-height: 1;
    transform: translateY(-7px);
    flex-shrink: 0;
  }
  .hour-line {
    flex: 1;
    height: 1px;
    background: rgba(237,229,216,.06);
    align-self: center;
  }

  /* ── Now indicator ── */
  .now-line {
    position: absolute;
    left: 52px;
    right: 8px;
    display: flex;
    align-items: center;
    z-index: 3;
    pointer-events: none;
  }
  .now-dot {
    width: 9px; height: 9px;
    border-radius: 50%;
    background: #ef4444;
    margin-left: -5px;
    flex-shrink: 0;
  }
  .now-bar {
    flex: 1;
    height: 1.5px;
    background: #ef4444;
  }

  /* ── Events container (within time-grid) ── */
  .events-container {
    position: absolute;
    left: 56px;
    right: 8px;
    top: 0;
    bottom: 0;
    pointer-events: none; /* children re-enable */
  }

  /* ── Event blocks ── */
  .event-block {
    position: absolute;
    border-radius: 8px;
    border-left: 3px solid;
    padding: 6px 9px 4px;
    overflow: hidden;
    cursor: pointer;
    pointer-events: all;
    transition: filter .15s, box-shadow .15s;
    z-index: 2;
    box-sizing: border-box;
  }
  .event-block:hover {
    filter: brightness(1.18);
    box-shadow: 0 4px 16px rgba(0,0,0,.35);
    z-index: 3;
  }
  .event-block.event-short { padding: 4px 8px; }

  .ev-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--cream);
    margin: 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .event-short .ev-title {
    font-size: 0.74rem;
    -webkit-line-clamp: 1;
  }
  .ev-meta {
    font-size: 0.7rem;
    color: rgba(237,229,216,.55);
    margin: 3px 0 0;
  }

  /* ── Empty state ── */
  .empty-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 55vh;
    gap: 0.6rem;
    padding: 2rem 1.5rem 6rem;
    text-align: center;
  }
  .empty-moon {
    font-size: 3rem;
    line-height: 1;
    opacity: 0.55;
    margin-bottom: 0.25rem;
  }
  .empty-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--cream);
    margin: 0;
  }
  .empty-sub {
    font-size: 0.82rem;
    color: rgba(237,229,216,.4);
    margin: 0;
  }
  .empty-days {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: center;
    margin-top: 0.75rem;
  }
  .empty-day-chip {
    display: flex; align-items: center; gap: 0.3rem;
    background: var(--ink-1);
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--cream);
    font-size: 0.78rem; font-weight: 500;
    padding: 0.35rem 0.75rem;
    cursor: pointer; font-family: 'Sora', system-ui, sans-serif;
    transition: border-color .15s, background .15s;
  }
  .empty-day-chip:hover { background: var(--ink-2); border-color: rgba(237,229,216,.2); }
  .chip-count {
    background: var(--gold-dim);
    color: var(--gold-lt);
    font-size: 0.68rem; font-weight: 600;
    border-radius: 999px;
    padding: 0 5px;
  }

  /* ── Session detail modal ── */
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.72);
    display: flex; align-items: flex-end; justify-content: center;
    z-index: 200;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: fadeIn .18s ease;
  }
  .sheet {
    background: #0C1827;
    width: 100%; max-width: 600px;
    border-radius: 24px 24px 0 0;
    max-height: 88vh;
    overflow-y: auto;
    position: relative;
    animation: slideUp .32s cubic-bezier(.22,1,.36,1);
    border: 1px solid rgba(237,229,216,.08);
    border-bottom: none;
    -webkit-overflow-scrolling: touch;
  }
  .sheet-handle {
    width: 36px; height: 4px;
    background: rgba(237,229,216,.12); border-radius: 2px;
    margin: .875rem auto 0;
  }
  .sheet-close {
    position: absolute; top: 1rem; right: 1rem;
    width: 32px; height: 32px;
    background: rgba(237,229,216,.06);
    border: 1px solid rgba(237,229,216,.08);
    border-radius: 50%; color: rgba(237,229,216,.6);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .15s, color .15s; z-index: 10;
  }
  .sheet-close:hover { background: rgba(237,229,216,.12); color: #EDE5D8; }
  .sheet-close svg { width: 14px; height: 14px; }

  .sheet-header {
    padding: 1.25rem 1.25rem .875rem;
    border-bottom: 1px solid rgba(237,229,216,.08);
  }
  .cat-tag {
    display: inline-flex; align-items: center;
    padding: .18rem .5rem; border-radius: 999px;
    font-size: .62rem; font-weight: 600;
    letter-spacing: .04em; text-transform: uppercase;
  }
  .sheet-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 1.4rem; font-weight: 500;
    line-height: 1.25; letter-spacing: -.02em;
    color: #EDE5D8; margin: .5rem 0 .3rem;
  }
  .sheet-lecturer { font-size: .9rem; color: #4BBFAD; margin: 0; }

  .sheet-body { padding: 1.25rem; }
  .sheet-summary {
    font-size: .875rem; color: rgba(237,229,216,.6);
    line-height: 1.65; margin-bottom: 1.25rem;
  }

  .detail-grid {
    background: rgba(237,229,216,.04);
    border: 1px solid rgba(237,229,216,.08);
    border-radius: 14px; overflow: hidden;
    margin-bottom: 1.25rem;
  }
  .detail-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 1rem; padding: .7rem 1rem;
    border-bottom: 1px solid rgba(237,229,216,.06);
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { font-size: .78rem; color: rgba(237,229,216,.35); flex-shrink: 0; }
  .detail-val   { font-size: .85rem; color: #EDE5D8; font-weight: 500; text-align: right; }
  .dur-chip {
    display: inline-block;
    margin-left: .4rem;
    background: rgba(237,229,216,.08);
    border-radius: 4px; padding: 0 .35rem;
    font-size: .72rem; color: rgba(237,229,216,.5);
    vertical-align: middle;
  }

  .join-section { margin-bottom: 1rem; }
  .join-label {
    font-size: .7rem; text-transform: uppercase; letter-spacing: .08em;
    color: rgba(237,229,216,.35); font-weight: 600; margin-bottom: .625rem;
  }
  .join-links { display: flex; flex-direction: column; gap: .5rem; }
  .join-btn {
    display: flex; align-items: center; gap: .75rem;
    padding: .75rem 1rem;
    background: rgba(200,146,42,.12);
    border: 1px solid rgba(200,146,42,.2);
    border-radius: 14px; color: #EDE5D8;
    text-decoration: none; font-size: .875rem; font-weight: 500;
    transition: background .15s;
  }
  .join-btn:hover { background: rgba(200,146,42,.18); }
  .join-platform {
    font-size: .68rem; color: #C8922A;
    font-weight: 600; text-transform: uppercase;
    letter-spacing: .05em; min-width: 56px;
  }

  @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }

  @media (min-width: 768px) {
    .sheet { border-radius: 24px; }
    .overlay { align-items: center; padding: 1rem; }
  }

  /* ── Loading skeleton ── */
  .skel-wrap { position: relative; height: 480px; }
  .skel-event {
    position: absolute;
    left: 56px; right: 8px;
    border-radius: 8px;
    background: rgba(237,229,216,.05);
    animation: pulse 1.4s ease-in-out infinite;
  }
  .skel-axis { position: absolute; left: 0; right: 0; top: 0; }
  .skel-hour {
    position: absolute;
    left: 52px; right: 8px; height: 1px;
    background: rgba(237,229,216,.05);
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: .4; }
    50%       { opacity: .75; }
  }
</style>
