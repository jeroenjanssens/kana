import '@fontsource-variable/inter'
import './styles/app.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { registerPwa } from './lib/ui/pwa'
import { toast } from './state/ui.svelte'

const app = mount(App, { target: document.getElementById('app')! })

void registerPwa({
  onNeedRefresh: (update) =>
    toast('A new version of kana is available', { label: 'Reload', run: update }, 0),
  onOfflineReady: () => toast('kana is ready to work offline'),
})

export default app
