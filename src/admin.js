import { mount } from 'svelte'
import Admin from './components/Admin.svelte'
import './app.css'

mount(Admin, {
  target: document.getElementById('app'),
})
