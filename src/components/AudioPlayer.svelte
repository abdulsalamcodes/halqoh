<script>
  let { onNavigate } = $props()

  let isPlaying = $state(false)
  let currentTrack = $state('Tawheed for beginners')
  let progress = $state(20)
  let currentTime = $state('1:23')
  let totalTime = $state('6:55')

  function togglePlay() {
    isPlaying = !isPlaying
  }

  const tracks = [
    { title: 'Tawheed for Beginners', active: true },
    { title: 'The Prophet\'s Character', active: false },
    { title: 'Islamic Ethics', active: false },
    { title: 'Fasting in Ramadan', active: false },
  ]
</script>

<div class="player-page">
  <nav class="navbar">
    <button class="back-btn" onclick={() => onNavigate('landing')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
    <img src="/images/Halqoh Logo.png" alt="Halqoh" class="logo" />
    <div class="nav-actions">
      <a href="/" class="btn btn-ghost">Discover</a>
    </div>
  </nav>

  <main class="player-content">
    <div class="player-main">
      <div class="album-art">
        <div class="album-icon">🎵</div>
      </div>
      
      <div class="track-info">
        <span class="track-label">NOW PLAYING</span>
        <h2>{currentTrack}</h2>
        <p class="artist">Sheikh Muhammad Salah</p>
      </div>

      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
        <div class="time-display">
          <span>{currentTime}</span>
          <span>{totalTime}</span>
        </div>
      </div>

      <div class="controls">
        <button class="control-btn" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/>
          </svg>
        </button>
        
        <button class="control-btn play-btn" onclick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {#if isPlaying}
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z"/>
            </svg>
          {/if}
        </button>
        
        <button class="control-btn" aria-label="Next">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zm8-12v12h2V6h-2z"/>
          </svg>
        </button>
      </div>

      <button class="download-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        Download
      </button>
    </div>

    <aside class="queue-panel">
      <h3>Up Next</h3>
      <div class="queue-list">
        {#each tracks as track, i}
          <div class="queue-item" class:active={track.active}>
            <span class="queue-number">{i + 1}</span>
            <div class="queue-info">
              <span class="queue-title">{track.title}</span>
              <span class="queue-artist">Sheikh Muhammad Salah</span>
            </div>
            <button class="play-icon" aria-label="Play">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7L8 5z"/>
              </svg>
            </button>
          </div>
        {/each}
      </div>
    </aside>
  </main>

  <footer class="footer">
    <p>All Rights Reserved. Halqah Directories &copy;2020</p>
  </footer>
</div>

<style>
  .player-page {
    min-height: 100vh;
    background: #0c1b2b;
    display: flex;
    flex-direction: column;
  }

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: rgba(12, 27, 43, 0.95);
    backdrop-filter: blur(10px);
  }

  .back-btn {
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    align-items: center;
  }

  .back-btn svg {
    width: 24px;
    height: 24px;
  }

  .logo {
    height: 36px;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .btn {
    padding: 0.5rem 1.25rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  .btn-ghost {
    background: transparent;
    color: #fff;
  }

  .btn-ghost:hover {
    color: #ff8a04;
  }

  /* .avatar - kept for future use when auth is added */

  .player-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 2rem;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .player-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .album-art {
    width: 280px;
    height: 280px;
    background: linear-gradient(135deg, #1a3a5c 0%, #0c1b2b 100%);
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  .album-icon {
    font-size: 5rem;
  }

  .track-info {
    margin-bottom: 2rem;
  }

  .track-label {
    font-size: 0.75rem;
    color: #ff8a04;
    letter-spacing: 2px;
    font-weight: 600;
  }

  .track-info h2 {
    font-size: 1.75rem;
    margin: 0.5rem 0;
  }

  .artist {
    color: rgba(255, 255, 255, 0.6);
  }

  .progress-section {
    width: 100%;
    max-width: 400px;
    margin-bottom: 2rem;
  }

  .progress-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff8a04, #ff9f1c);
    border-radius: 3px;
    transition: width 0.1s ease;
  }

  .time-display {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .control-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #fff;
    transition: all 0.2s ease;
  }

  .control-btn svg {
    width: 20px;
    height: 20px;
  }

  .control-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  .play-btn {
    width: 64px;
    height: 64px;
    background: #ff8a04;
  }

  .play-btn:hover {
    background: #ff9f1c;
  }

  .play-btn svg {
    width: 28px;
    height: 28px;
  }

  .download-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: #fff;
    cursor: pointer;
    font-size: 0.95rem;
    transition: all 0.2s ease;
  }

  .download-btn svg {
    width: 20px;
    height: 20px;
  }

  .download-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .queue-panel {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1.5rem;
    height: fit-content;
  }

  .queue-panel h3 {
    font-size: 1rem;
    margin-bottom: 1rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .queue-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .queue-item.active {
    background: rgba(255, 138, 4, 0.1);
    border: 1px solid rgba(255, 138, 4, 0.3);
  }

  .queue-number {
    width: 24px;
    text-align: center;
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.875rem;
  }

  .queue-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .queue-title {
    font-weight: 500;
  }

  .queue-artist {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .play-icon {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 0.25rem;
  }

  .play-icon svg {
    width: 20px;
    height: 20px;
  }

  .queue-item:hover .play-icon {
    color: #fff;
  }

  .footer {
    padding: 1.5rem 2rem;
    text-align: center;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .footer p {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.875rem;
  }

  @media (max-width: 900px) {
    .player-content {
      grid-template-columns: 1fr;
      padding: 1.5rem;
    }

    .album-art {
      width: 200px;
      height: 200px;
    }

    .queue-panel {
      order: -1;
    }
  }
</style>