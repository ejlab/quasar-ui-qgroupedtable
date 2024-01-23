import { h } from 'vue'
import { QBadge } from 'quasar'

export default {
  name: 'QGroupedTable',

  setup () {
    return () => h(QBadge, {
      class: 'QGroupedTable',
      label: 'QGroupedTable'
    })
  }
}
