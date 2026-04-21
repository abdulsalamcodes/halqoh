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
  let halqahs     = $state([])
  let loading     = $state(true)
  let currentDate = $state(new Date())
  let now         = $state(new Date())
  let scrollEl    = $state(null)

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

  let nowLineStyle = $derived.by(() => {
    if (!isToday(currentDate)) return null
    const h = now.getHours() + now.getMinutes() / 60
    if (h < GRID_START || h > GRID_END) return null
    return `top:${(h - GRID_START) * HOUR_H}px`
  })

  // ── Event positioning ──────────────────────────────────────
  function eventStyle(s) {
    const start = parseHours(s.schedule?.recurring?.start_time)
    if (start === null || start < GRID_START || start > GRID_END) return null
    const end      = parseHours(s.schedule?.recurring?.end_time)
    const duration = (end !== null && end > start) ? end - start : 0.75
    return {
      top:    Math.round((start - GRID_START) * HOUR_H),
      height: Math.max(Math.round(duration * HOUR_H), 36),
      short:  duration * HOUR_H < 46,
    }
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
        {#each sessionsForDay as session}
          {@const ev   = eventStyle(session)}
          {@const cat  = getCategoryName(session.category)}
          {@const col  = catColor(cat)}
          {@const bg   = hexToRgba(col, 0.14)}
          {#if ev}
            <div
              class="event-block"
              class:event-short={ev.short}
              style="top:{ev.top}px; height:{ev.height}px; border-left-color:{col}; background:{bg}"
            >
              <p class="ev-title">{session.title}</p>
              {#if !ev.short}
                <p class="ev-meta">
                  {fmtTime(session.schedule.recurring.start_time)}
                  {#if session.schedule.recurring.end_time}
                    · {fmtDuration(session.schedule.recurring.start_time, session.schedule.recurring.end_time)}
                  {/if}
                </p>
              {/if}
            </div>
          {/if}
        {/each}

      </div>
    {/if}
  </div>
</div>

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

  /* ── Event blocks ── */
  .event-block {
    position: absolute;
    left: 56px;
    right: 8px;
    border-radius: 8px;
    border-left: 3px solid;
    padding: 6px 9px 4px;
    overflow: hidden;
    cursor: pointer;
    transition: filter .15s;
    z-index: 2;
  }
  .event-block:hover { filter: brightness(1.15); }
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
