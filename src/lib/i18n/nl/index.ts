import type { Messages } from '../messages'
import nlCommon from './common'
import nlHome from './home'
import nlStudy from './study'
import nlPractice from './practice'
import nlTable from './table'
import nlStats from './stats'
import nlSettings from './settings'
import nlMisc from './misc'

const nl: Messages = {
  ...nlCommon,
  ...nlHome,
  ...nlStudy,
  ...nlPractice,
  ...nlTable,
  ...nlStats,
  ...nlSettings,
  ...nlMisc,
}

export default nl
