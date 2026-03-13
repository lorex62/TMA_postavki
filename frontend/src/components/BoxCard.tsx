import { Box, Item } from '../types'

interface Props {
  box: Box
  skus: string[]
  onUpdate: (items: Item[]) => void
}

function pluralItems(n: number): string {
  if (n === 1) return 'товар'
  if (n >= 2 && n <= 4) return 'товара'
  return 'товаров'
}

export default function BoxCard({ box, skus, onUpdate }: Props) {
  const addItem = () => {
    onUpdate([...box.items, { id: Date.now(), sku: skus[0], qty: 1 }])
  }

  const updateItem = (id: number, field: 'sku' | 'qty', value: string | number) => {
    onUpdate(
      box.items.map(item =>
        item.id === id
          ? { ...item, [field]: field === 'qty' ? Math.max(0, Number(value)) : value }
          : item,
      ),
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
      <div className="p-3 space-y-2">
        {box.items.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-2">Нет товаров</p>
        )}

        {/* Column labels (shown only when there are items) */}
        {box.items.length > 0 && (
          <div className="flex items-center gap-2 px-1 pb-0.5">
            <span className="w-5" />
            <span className="flex-1 text-xs text-gray-400 font-medium">Артикул</span>
            <span className="w-20 text-xs text-gray-400 font-medium text-center">Кол-во</span>
            <span className="w-6" />
          </div>
        )}

        {box.items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="text-gray-400 text-xs w-5 text-right shrink-0">
              {idx + 1}.
            </span>

            {/* SKU dropdown */}
            <select
              value={item.sku}
              onChange={e => updateItem(item.id, 'sku', e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
            >
              {skus.map(sku => (
                <option key={sku} value={sku}>
                  {sku}
                </option>
              ))}
            </select>

            {/* Quantity input */}
            <input
              type="number"
              min="1"
              value={item.qty}
              onChange={e => updateItem(item.id, 'qty', e.target.value)}
              className="w-20 shrink-0 text-sm border border-gray-200 rounded-lg px-2 py-2 text-center bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
            />

            {/* Remove button */}
            <button
              onClick={() => removeItem(item.id)}
              className="w-6 shrink-0 text-red-400 hover:text-red-600 transition-colors text-xl leading-none text-center"
              title="Удалить товар"
            >
              ×
            </button>
          </div>
        ))}
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
