import { mount } from 'svelte'
import MySessions from './components/MySessions.svelte'
import './app.css'

mount(MySessions, {
  target: document.getElementById('app'),
})