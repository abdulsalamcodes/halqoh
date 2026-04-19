import './polyfills'
import { mount } from 'svelte'
import About from './components/About.svelte'
import './app.css'

mount(About, {
  target: document.getElementById('app'),
})