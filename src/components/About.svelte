<script>
  let { onNavigate = null } = $props()
</script>

<div class="about-page">
  <nav class="navbar">
    {#if onNavigate}
      <button class="icon-btn" onclick={() => onNavigate('landing')}>←</button>
    {:else}
      <a href="/" class="icon-btn">←</a>
    {/if}
    <img src="/images/Halqoh Logo.png" alt="Halqoh" class="logo" />
    <span></span>
  </nav>

  <main class="content">
    <div class="hero">
      <div class="logo-large">📚</div>
      <h1>About Halqoh</h1>
      <p class="tagline">Discover Islamic Knowledge Sessions</p>
    </div>

    <section class="card">
      <h2>What is Halqoh?</h2>
      <p>
        Halqoh is a curated directory of authentic Islamic audio lectures (halqoh/sittings of knowledge) 
        compiled by the creator of this platform and fellow seekers of knowledge.
      </p>
      <p>
        Our sole purpose is to make it easy for Muslims to discover and connect with beneficial 
        lectures from trusted scholars - whether you're looking for Quran explanation, Hadith studies, 
        Islamic jurisprudence, or spiritual development.
      </p>
    </section>

    <section class="card">
      <h2>Our Mission</h2>
      <p>
        We ask Allah to accept this effort from us as an act of <strong>ibadah</strong> (worship) 
        and a means of drawing closer to Him and His Messenger (peace be upon him).
      </p>
      <p>
        This is a simple, free service meant to serve the Ummah - no ads, no subscriptions, no hidden agenda.
      </p>
    </section>

    <section class="card">
      <h2>Contribute</h2>
      <p>
        If you've found a beneficial lecture that should be listed here, we'd love to know about it.
        Please reach out respectfully and we'll consider adding it to the directory.
      </p>
      <a href="mailto:abooubaydah01@gmail.com" class="contact-btn">
        📧 Contact Us
      </a>
    </section>

    <footer class="footer">
      <p>Made with ❤️ for the Ummah</p>
      <p class="dua">May Allah reward you abundantly (Jannah)</p>
    </footer>
  </main>

  <nav class="bottom-nav">
    <a href="/" class="nav-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <span>Discover</span>
    </a>
    <a href="/mysessions.html" class="nav-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>
      <span>Saved</span>
    </a>
    <a href="/about.html" class="nav-link active">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      <span>About</span>
    </a>
  </nav>
</div>

<style>
  :root { --bg: #0c1b2b; --primary: #ff8a04; }
  .about-page { min-height: 100vh; background: var(--bg); color: #fff; font-family: 'Inter', system-ui, sans-serif; padding-bottom: 70px; }
  
  .navbar { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: rgba(12,27,43,0.95); }
  .logo { height: 32px; }
  .icon-btn { background: none; border: none; color: #fff; font-size: 1.25rem; cursor: pointer; padding: 0.5rem; text-decoration: none; }
  .nav-right { display: flex; align-items: center; gap: 0.5rem; }
  .text-btn { padding: 0.5rem 1rem; color: #fff; text-decoration: none; }
  
  .content { padding: 1rem; max-width: 600px; margin: 0 auto; }
  
  .hero { text-align: center; padding: 2rem 0; }
  .logo-large { font-size: 4rem; margin-bottom: 1rem; }
  .hero h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
  .tagline { color: rgba(255,255,255,0.6); font-size: 1.1rem; }
  
  .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
  .card h2 { font-size: 1.1rem; margin: 0 0 0.75rem; color: var(--primary); }
  .card p { color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 0.75rem; }
  .card p:last-child { margin-bottom: 0; }
  .card strong { color: var(--primary); }
  
  .contact-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: var(--primary); border-radius: 8px; color: var(--bg); text-decoration: none; font-weight: 600; margin-top: 0.5rem; }
  
  .footer { text-align: center; padding: 2rem 1rem; }
  .footer p { margin: 0; }
  .dua { color: var(--primary); margin-top: 0.5rem !important; }
  
  .bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(12,27,43,0.98); border-top: 1px solid rgba(255,255,255,0.08); padding: 0.5rem 1rem; z-index: 100; }
  .nav-link { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.4rem; color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.7rem; border-radius: 8px; }
  .nav-link svg { width: 20px; height: 20px; }
  .nav-link.active { color: var(--primary); }
  
  @media (max-width: 768px) {
    .bottom-nav { display: flex; }
    .content { padding-bottom: 5rem; }
  }
</style>