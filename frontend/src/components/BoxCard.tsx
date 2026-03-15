import { Box, Item, Catalog } from '../types'

interface Props {
  box: Box
  catalog: Catalog
  skuNames: string[]
  onUpdate: (items: Item[]) => void
}

function pluralItems(n: number): string {
  if (n === 1) return 'товар'
  if (n >= 2 && n <= 4) return 'товара'
  return 'товаров'
}

const activeCls =
  'w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-2 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent'
const disabledCls =
  'w-full text-sm text-gray-400 border border-gray-100 rounded-lg px-2 py-2 bg-gray-100 cursor-not-allowed'

export default function BoxCard({ box, catalog, skuNames, onUpdate }: Props) {
  const addItem = () => {
    const sku = skuNames[0]
    const cfg = catalog[sku]
    onUpdate([...box.items, { id: Date.now(), sku, color: cfg.colors[0] ?? '', size: cfg.sizes[0] ?? '', qty: 1 }])
  }

  const updateItem = (id: number, field: keyof Omit<Item, 'id'>, value: string | number) => {
    onUpdate(
      box.items.map(item => {
        if (item.id !== id) return item
        if (field === 'qty') return { ...item, qty: Math.max(0, Number(value)) }
        if (field === 'sku') {
          const newSku = String(value)
          const cfg = catalog[newSku]
          return {
            ...item,
            sku: newSku,
            color: cfg?.colors[0] ?? '',
            size: cfg?.sizes[0] ?? '',
          }
        }
        return { ...item, [field]: value }
      }),
    )
  }

  const removeItem = (id: number) => {
    onUpdate(box.items.filter(item => item.id !== id))
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Box header */}
      <div className="bg-blue-600 px-4 py-2.5 flex items-center">
        <span className="text-white font-bold text-sm">📦 Коробка №{box.boxId}</span>
        <span className="ml-auto text-blue-200 text-xs">
          {box.items.length} {pluralItems(box.items.length)}
        </span>
      </div>

      {/* Items list */}
      <div className="p-3 space-y-3">
        {box.items.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-2">Нет товаров</p>
        )}

        {box.items.map((item, idx) => {
          const cfg = catalog[item.sku]
          const hasColors = cfg && cfg.colors.length > 0
          const hasSizes  = cfg && cfg.sizes.length > 0

          return (
            <div key={item.id} className="border border-gray-100 rounded-xl p-2.5 space-y-2 bg-gray-50/50">
              {/* Row 1: index + Артикул + delete */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-5 text-right shrink-0">{idx + 1}.</span>
                <select
                  value={item.sku}
                  onChange={e => updateItem(item.id, 'sku', e.target.value)}
                  className={activeCls}
                >
                  {skuNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeItem(item.id)}
                  className="w-6 shrink-0 text-red-400 hover:text-red-600 transition-colors text-xl leading-none text-center"
                  title="Удалить товар"
                >
                  ×
                </button>
              </div>

              {/* Row 2: Цвет + Размер + Кол-во */}
              <div className="flex items-center gap-2 pl-7">
                {/* Цвет */}
                {hasColors ? (
                  <select
                    value={item.color}
                    onChange={e => updateItem(item.id, 'color', e.target.value)}
                    className={activeCls}
                  >
                    {cfg.colors.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <div className={disabledCls + ' text-center'}>—</div>
                )}

                {/* Размер */}
                {hasSizes ? (
                  <select
                    value={item.size}
                    onChange={e => updateItem(item.id, 'size', e.target.value)}
                    className="w-20 shrink-0 text-sm text-gray-900 border border-gray-200 rounded-lg px-2 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                  >
                    {cfg.sizes.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-20 shrink-0 text-sm text-gray-400 border border-gray-100 rounded-lg px-2 py-2 text-center bg-gray-100 cursor-not-allowed">—</div>
                )}

                {/* Кол-во */}
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={e => updateItem(item.id, 'qty', e.target.value)}
                  className="w-16 shrink-0 text-sm text-gray-900 border border-gray-200 rounded-lg px-2 py-2 text-center bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Add item button */}
      <div className="px-3 pb-3">
        <button
          onClick={addItem}
          className="w-full text-sm text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 py-2 rounded-lg transition-colors bg-blue-50 hover:bg-blue-100"
        >
          + Добавить товар в эту коробку
        </button>
      </div>
    </div>
  )
}
