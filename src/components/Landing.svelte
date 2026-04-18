<script>
  let { onNavigate } = $props()

  function goToPlayer() {
    onNavigate('player')
  }

  const features = [
    {
      title: 'Create Groups',
      description: 'Create专属 groups for your lectures and organize content by topic, speaker, or theme.',
      icon: '👥'
    },
    {
      title: 'Upload & Share',
      description: 'Easily upload audio lectures and share them with your group members.',
      icon: '📤'
    },
    {
      title: 'Subscribe',
      description: 'Join groups to stay updated with new lectures from speakers you follow.',
      icon: '🔔'
    },
    {
      title: 'Listen Offline',
      description: 'Download lectures and listen anywhere, even without internet.',
      icon: '🎧'
    }
  ]
</script>

<div class="landing">
  <nav class="navbar">
    <img src="/images/Halqoh Logo.png" alt="Halqoh" class="logo" />
    <div class="nav-actions">
      <button class="btn btn-ghost">Log In</button>
      <button class="btn btn-primary" onclick={goToPlayer}>Get Started</button>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-content">
      <h1>Islamic Audio Lectures,<br />Reimagined</h1>
      <p class="hero-subtitle">
        Your one-stop platform for authentic Islamic lectures. Record, share, and listen — whether you're a speaker, coordinator, or seeker.
      </p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" onclick={goToPlayer}>Start Learning</button>
        <a href="/" class="btn btn-outline">Explore</a>
      </div>
    </div>
    <div class="hero-visual">
      <div class="visual-card">
        <div class="visual-icon">🎙️</div>
      </div>
    </div>
  </section>

  <section class="features">
    <h2>Everything You Need</h2>
    <p class="section-subtitle">Powerful features for speakers and listeners alike</p>
    <div class="features-grid">
      {#each features as feature, i}
        <div class="feature-card">
          <span class="feature-icon">{feature.icon}</span>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="cta">
    <h2>Ready to Get Started?</h2>
    <p>Join thousands learning from authentic Islamic lectures</p>
    <button class="btn btn-primary btn-lg" onclick={goToPlayer}>Start Now — It's Free</button>
  </section>

  <footer class="footer">
    <div class="footer-content">
      <img src="/images/Halqoh Logo.png" alt="Halqoh" class="logo-sm" />
      <p>All Rights Reserved. Halqah Directories &copy;2020</p>
    </div>
  </footer>
</div>

<style>
  .landing {
    min-height: 100vh;
    background: #0c1b2b;
  }

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(12, 27, 43, 0.9);
    backdrop-filter: blur(10px);
    z-index: 100;
  }

  .logo {
    height: 40px;
  }

  .nav-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .btn {
    padding: 0.6rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-ghost {
    background: transparent;
    color: #fff;
  }

  .btn-ghost:hover {
    color: #ff8a04;
  }

  .btn-primary {
    background: #ff8a04;
    color: #0c1b2b;
  }

  .btn-primary:hover {
    background: #ff9f1c;
    transform: translateY(-1px);
  }

  .btn-outline {
    background: transparent;
    color: #fff;
    border: 2px solid rgba(255,255,255,0.3);
  }

  .btn-outline:hover {
    border-color: #fff;
  }

  .btn-lg {
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }

  .hero {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
    min-height: 100vh;
    padding: 8rem 4rem 4rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .hero-content h1 {
    font-size: 3.5rem;
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg, #fff 0%, #ff8a04 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: rgba(255,255,255,0.7);
    line-height: 1.6;
    margin-bottom: 2rem;
    max-width: 500px;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
  }

  .hero-visual {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .visual-card {
    width: 300px;
    height: 300px;
    background: linear-gradient(135deg, #1a3a5c 0%, #0c1b2b 100%);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 60px rgba(255,138,4,0.2);
  }

  .visual-icon {
    font-size: 6rem;
  }

  .features {
    padding: 6rem 4rem;
    max-width: 1400px;
    margin: 0 auto;
    text-align: center;
  }

  .features h2 {
    font-size: 2.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .section-subtitle {
    color: rgba(255,255,255,0.6);
    margin-bottom: 3rem;
    font-size: 1.1rem;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }

  .feature-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 2rem;
    text-align: left;
    transition: all 0.3s ease;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255,138,4,0.3);
    background: rgba(255,138,4,0.05);
  }

  .feature-icon {
    font-size: 2rem;
    display: block;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
  }

  .feature-card p {
    color: rgba(255,255,255,0.6);
    line-height: 1.5;
    font-size: 0.95rem;
  }

  .cta {
    padding: 6rem 4rem;
    text-align: center;
    background: linear-gradient(180deg, transparent 0%, rgba(255,138,4,0.05) 100%);
  }

  .cta h2 {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }

  .cta p {
    color: rgba(255,255,255,0.6);
    margin-bottom: 2rem;
    font-size: 1.1rem;
  }

  .footer {
    padding: 2rem 4rem;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1400px;
    margin: 0 auto;
  }

  .logo-sm {
    height: 30px;
  }

  .footer-content p {
    color: rgba(255,255,255,0.4);
    font-size: 0.875rem;
  }

  @media (max-width: 1024px) {
    .features-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .hero {
      grid-template-columns: 1fr;
      text-align: center;
      padding: 6rem 1.5rem 3rem;
    }

    .hero-content h1 {
      font-size: 2.25rem;
    }

    .hero-subtitle {
      font-size: 1rem;
    }

    .hero-actions {
      justify-content: center;
    }

    .hero-visual {
      display: none;
    }

    .features {
      padding: 4rem 1.5rem;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }

    .cta {
      padding: 4rem 1.5rem;
    }

    .cta h2 {
      font-size: 1.75rem;
    }

    .navbar {
      padding: 1rem 1.5rem;
    }

    .footer-content {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
  }
</style>