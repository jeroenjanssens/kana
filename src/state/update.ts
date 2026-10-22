import { installUpdate } from '../lib/ui/pwa'
import { APP_VERSION, checkVersion } from '../lib/ui/version'
import { t } from './i18n.svelte'
import { toast } from './ui.svelte'

/** Check right now whether a newer version is out, and if so, install it and reload. */
export async function checkForUpdates(): Promise<void> {
  const result = await checkVersion(import.meta.env.BASE_URL)
  if (result.kind === 'newer') {
    toast(t('misc.updating', { version: result.version }), undefined, 0)
    await installUpdate()
  } else if (result.kind === 'latest') {
    toast(t('misc.latestVersion', { version: APP_VERSION }))
  } else {
    toast(t('misc.updateCheckFailed'))
  }
}
