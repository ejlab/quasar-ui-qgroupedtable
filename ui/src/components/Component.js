import {
  computed,
  defineComponent,
  getCurrentInstance,
  h,
  ref,
  vShow,
  watch,
  withDirectives,
} from 'vue';
import { QBadge, QBtn, QCheckbox, QTable, QTd, QTr } from 'quasar';


function isNumber(v) {
  return typeof v === 'number' && isFinite(v);
}

function isDate(v) {
  return Object.prototype.toString.call(v) === '[object Date]';
}

function sortDate(a, b) {
  return +new Date(a) - +new Date(b);
}

export default defineComponent({
  name: 'QGroupedTable',
  emits: ['row-click', 'row-dblclick', 'row-contextmenu'],
  props: {
    rows: {
      type: Array,
      default: () => [],
    },
    columns: Array,
    visibleColumns: Array,
    sortMethod: Function,
    paginationLabel: Function,
    // selection: useTableRowSelectionProps.selection,
    selection: {
      type: String,
      default: 'none',
      validator: (v) => ['single', 'multiple', 'none'].includes(v),
    },
    color: {
      type: String,
      default: 'grey-8',
    },
    dark: {
      type: Boolean,
      default: null,
    },
    dense: Boolean,
    groupBy: {
      type: String,
      default: undefined,
    },
    noGroupLabel: {
      type: String,
      default: 'Uncategorized',
    },
    groupHeaderColor: {
      type: String,
      default: 'secondary',
    },
    groupLabelColor: {
      type: String,
      default: 'white',
    },
    groupBadgeColor: {
      type: String,
      default: 'primary',
    },
    groupBadgeTextColor: {
      type: String,
      default: 'white',
    },
    groupDefaultOpened: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { slots, emit }) {
    const vm = getCurrentInstance();
    const isDark = computed(() =>
      props.dark === null ? vm.proxy?.$q.dark.isActive : props.dark
    );

    const proxySlots = { ...slots };

    const hasSelectionMode = computed(() => {
      return props.selection !== 'none';
    });

    const groupCol = computed(() =>
      props.columns?.find((col) => col.name === props.groupBy)
    );
    const groupable = computed(() => !!groupCol.value);
    const groupItemCounts = new Map();
    const groupExpand = ref(new Map());

    const computedVisibleColumns = computed(() => {
      if (groupable.value) {
        const cols =
          props.visibleColumns !== void 0
            ? props.visibleColumns
            : props.columns?.map((col) => col.name);
        return cols?.filter((col) => col !== props.groupBy);
      }
      return props.visibleColumns;
    });

    function grouping(data) {
      data.sort((a, b) => {
        const aGroup = getCellValue(groupCol.value, a);
        const bGroup = getCellValue(groupCol.value, b);
        return aGroup > bGroup ? 1 : aGroup < bGroup ? -1 : 0;
      });
    }

    const computedRows = computed(() => {
      let rows = props.rows;
      if (groupable.value) {
        grouping(rows);
        rows.forEach((row) => {
          row.expanded = groupExpand.value.get(
            getCellValue(groupCol.value, row)
          );
        });
      }
      return rows;
    });

    const computedSortMethod = computed(() =>
      groupable.value
        ? (data, sortBy, descending) => {
          if (props.sortMethod !== void 0) {
            props.sortMethod(data, sortBy, descending);
          } else {
            const col = props.columns?.find(
              (col) => col.name === sortBy
            );
            if (col !== void 0 || col.field !== void 0) {
              const dir = descending === true ? -1 : 1,
                val =
                  typeof col.field === 'function'
                    ? (v) => col.field(v)
                    : (v) => v[col.field];

              data.sort((a, b) => {
                let A = val(a),
                  B = val(b);

                if (col.rawSort !== void 0) {
                  return col.rawSort(A, B, a, b) * dir;
                }
                if (A === null || A === void 0) {
                  return -1 * dir;
                }
                if (B === null || B === void 0) {
                  return 1 * dir;
                }
                if (col.sort !== void 0) {
                  // gets called without rows that have null/undefined as value
                  // due to the above two statements
                  return col.sort(A, B, a, b) * dir;
                }
                if (isNumber(A) === true && isNumber(B) === true) {
                  return (A - B) * dir;
                }
                if (isDate(A) === true && isDate(B) === true) {
                  return sortDate(A, B) * dir;
                }
                if (typeof A === 'boolean' && typeof B === 'boolean') {
                  return (+A - +B) * dir;
                }

                [A, B] = [A, B].map((s) =>
                  (s + '').toLocaleString().toLowerCase()
                );

                return A < B ? -1 * dir : A === B ? 0 : dir;
              });
            }
          }

          grouping(data);

          return data;
        }
        : props.sortMethod
    );

    function getCellValue(col, row) {
      const val =
        typeof col.field === 'function' ? col.field(row) : row[col.field];
      return col.format !== void 0 ? col.format(val, row) : val;
    }

    function setDefaultGroupOpened(rows) {
      rows.forEach((row) => {
        const groupName = getCellValue(groupCol.value, row);
        if (!groupExpand.value.has(groupName)) {
          groupExpand.value.set(groupName, props.groupDefaultOpened);
        }
      });
    }

    const additionalProps = {};

    let group = null;

    if (groupable.value) {
      setDefaultGroupOpened(props.rows);
      watch(() => props.rows, setDefaultGroupOpened);
      proxySlots.body = (rowScope) => {
        const rows = [];
        const groupName = getCellValue(groupCol.value, rowScope.row);
        if (group !== groupName) {
          groupItemCounts.set(groupName, 0);
          rows.push(
            h(
              QTr,
              {
                noHover: true,
                class: [
                  'table-group-header',
                  `bg-${props.groupHeaderColor}`,
                  `text-${props.groupLabelColor}`,
                ],
              },
              () =>
                h(
                  QTd,
                  {
                    noHover: true,
                    colspan: '100%',
                    class: [`bg-${props.groupHeaderColor}`, 'text-bold'],
                  },
                  () =>
                    h(
                      'div',
                      { class: ['table-group-header', 'row', 'q-gutter-sm'] },
                      [
                        h(QBtn, {
                          size: 'xs',
                          dense: true,
                          round: true,
                          unelevated: true,
                          color: props.groupBadgeColor,
                          textColor: props.groupBadgeTextColor,
                          icon: rowScope.row.expanded ? 'remove' : 'add',
                          onClick: () =>
                            groupExpand.value.set(
                              groupName,
                              !groupExpand.value.get(groupName)
                            ),
                        }),
                        h('span', groupName || props.noGroupLabel),
                        h(
                          QBadge,
                          {
                            color: props.groupBadgeColor,
                            textColor: props.groupBadgeTextColor,
                          },
                          () => groupItemCounts.get(groupName)
                        ),
                      ]
                    )
                )
            )
          );
          group = groupName;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        groupItemCounts.set(
          groupName,
          (groupItemCounts.get(groupName) || 0) + 1
        );
        const cells = rowScope.cols.map((col) => {
          const cellScope = {
            ...rowScope,
            col,
            value: getCellValue(col, rowScope.row),
          };
          const slot = slots[`body-cell-${col.name}`];
          return slot !== void 0
            ? slot(cellScope)
            : h(QTd, { key: col.name, props: cellScope }, () =>
              String(cellScope.value)
            );
        });
        if (hasSelectionMode.value) {
          const slot = slots['body-selection'];
          const content =
            slot !== void 0
              ? slot(rowScope)
              : [
                h(QCheckbox, {
                  modelValue: rowScope.selected,
                  color: props.color,
                  dark: isDark.value,
                  dense: props.dense,
                }),
              ];
          cells.unshift(
            h(QTd, { class: 'q-table--col-auto-width' }, () => content)
          );
        }
        rows.push(
          withDirectives(
            h(
              QTr,
              {
                props: rowScope,
                onClick: (event) => {
                  emit('row-click', event, rowScope.row, rowScope.rowIndex);
                },
                onDblclick: (event) => {
                  emit('row-dblclick', event, rowScope.row, rowScope.rowIndex);
                },
                onContextmenu: (event) => {
                  emit(
                    'row-contextmenu',
                    event,
                    rowScope.row,
                    rowScope.rowIndex
                  );
                },
              },
              () => cells
            ),
            [[vShow, rowScope.row.expanded]]
          )
        );
        return rows;
      };

      additionalProps.rowsPerPageOptions = [0];
      additionalProps.paginationLabel = (
        firstRowIndex,
        endRowIndex,
        totalRowsNumber
      ) => {
        group = null;
        if (props.paginationLabel !== void 0) {
          return props.paginationLabel(
            firstRowIndex,
            endRowIndex,
            totalRowsNumber
          );
        }
        return totalRowsNumber;
      };
    }

    return () =>
      h(
        QTable,
        {
          rows: computedRows.value,
          columns: props.columns,
          visibleColumns: computedVisibleColumns.value,
          selection: props.selection,
          sortMethod: computedSortMethod.value,
          color: props.color,
          dark: props.dark,
          dense: props.dense,
          onRowClick: (event, row, index) => {
            emit('row-click', event, row, index);
          },
          onRowDblclick: (event, row, index) => {
            emit('row-dblclick', event, row, index);
          },
          onRowContextmenu: (event, row, index) => {
            emit('row-contextmenu', event, row, index);
          },
          ...additionalProps,
        },
        proxySlots
      );
  },
});