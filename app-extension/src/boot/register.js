import { boot } from 'quasar/wrappers'
import VuePlugin from 'quasar-ui-qgroupedtable'

export default boot(({ app }) => {
  app.use(VuePlugin)
})
