import { mount } from 'svelte'
import Calendar from './components/Calendar.svelte'
import './app.css'

mount(Calendar, {
  target: document.getElementById('app'),
})
