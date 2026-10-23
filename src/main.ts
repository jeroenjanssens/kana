import '@fontsource-variable/inter'
import './styles/app.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { registerPwa } from './lib/ui/pwa'
import { toast } from './state/ui.svelte'
import { loadLanguage, t } from './state/i18n.svelte'

// Only the interface language is downloaded; waiting for it means no flash of English.
void loadLanguage().then(() => {
  mount(App, { target: document.getElementById('app')! })
  document.getElementById('boot')?.remove()
})

void registerPwa({
  onNeedRefresh: (update) =>
    toast(t('misc.newVersionAvailable'), { label: t('misc.reload'), run: update }, 0),
  onOfflineReady: () => toast(t('misc.offlineReady')),
})
