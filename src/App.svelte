<script>
  import Landing from './components/Landing.svelte'
  import AudioPlayer from './components/AudioPlayer.svelte'
  import Discover from './components/Discover.svelte'

  let currentPage = $state('landing')

  function navigateTo(page) {
    currentPage = page
  }
</script>

<main>
  {#if currentPage === 'landing'}
    <Landing onNavigate={navigateTo} />
  {:else if currentPage === 'player'}
    <AudioPlayer onNavigate={navigateTo} />
  {:else if currentPage === 'discover'}
    <Discover onNavigate={navigateTo} />
  {/if}
</main>