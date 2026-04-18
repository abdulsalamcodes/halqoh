import { mount } from 'svelte'
import Discover from './components/Discover.svelte'
import './app.css'

mount(Discover, {
  target: document.getElementById('app'),
})