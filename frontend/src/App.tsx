import { useState, useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import { Box, Item, Catalog } from './types'
import BoxCard from './components/BoxCard'

export const CATALOG: Catalog = {
  'Напульсники':      { colors: ['Чёрный', 'Красный', 'Синий', 'Серый', 'Голубой'], sizes: [] },
  'Наколенники':      { colors: ['Чёрный', 'Красный', 'Синий', 'Серый'],            sizes: [] },
  'Пуанты':           { colors: [], sizes: ['29','30','31','32','33','34','35','36','37','38','39','40','41','42'] },
  'Скальники':        { colors: ['Голубой', 'Красный', 'Фиолетовый'],               sizes: ['32','33','34','35','36','37','38','39','40','41','42','43','44'] },
  'Спортивные наборы':{ colors: [], sizes: [] },
}

const SKU_NAMES = Object.keys(CATALOG)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type Screen = 'home' | 'assembly'

function pluralBoxes(n: number): string {
  if (n === 1) return 'коробка'
  if (n >= 2 && n <= 4) return 'коробки'
  return 'коробок'
}

function makeFirstItem(): Item {
  return { id: Date.now(), sku: '', color: '', size: '', qty: 1 }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
  }, [])

  const handleStartNew = () => {
    setBoxes([{ boxId: 1, items: [makeFirstItem()] }])
    setScreen('assembly')
    setError(null)
  }

  const handleAddBox = () => {
    setBoxes(prev => [
      ...prev,
      { boxId: prev.length + 1, items: [makeFirstItem()] },
    ])
  }

  const handleUpdateBox = (boxId: number, items: Item[]) => {
    setBoxes(prev => prev.map(b => (b.boxId === boxId ? { ...b, items } : b)))
  }

  const handleSubmit = async () => {
    const hasItems = boxes.some(b => b.items.some(i => i.qty > 0))
    if (!hasItems) {
      setError('Добавьте хотя бы один товар с количеством больше 0.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const userId = WebApp.initDataUnsafe?.user?.id ?? 0

      const response = await fetch(`${API_URL}/api/submit-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxes, userId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Ошибка сервера')
      }

      WebApp.showAlert('✅ Файл поставки сформирован и отправлен вам в чат!', () => {
        WebApp.close()
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте снова.',
      )
    } finally {
      setLoading(false)
    }
  }

  const username = WebApp.initDataUnsafe?.user?.first_name || WebApp.initDataUnsafe?.user?.username || ''

  /* ── HOME SCREEN ── */
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6">
        <div className="text-center mb-10">
          <div className="text-7xl mb-5 select-none">📦</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Привет{username ? `, ${username}` : ''}!
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Для того, чтобы сформировать поставку, нажми кнопку ниже.
          </p>
        </div>

        <button
          onClick={handleStartNew}
          className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg transition-all duration-150 text-base"
        >
          Сформировать новый файл для поставки
        </button>
      </div>
    )
  }

  /* ── ASSEMBLY SCREEN ── */
  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setScreen('home')}
            className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none"
          >
            ←
          </button>
          <h1 className="text-lg font-bold text-gray-800">Сборка поставки</h1>
          <span className="ml-auto text-sm text-gray-400 tabular-nums">
            {boxes.length} {pluralBoxes(boxes.length)}
          </span>
        </div>
      </div>

      {/* Boxes */}
      <div className="px-4 py-4 space-y-4">
        {boxes.map(box => (
          <BoxCard
            key={box.boxId}
            box={box}
            catalog={CATALOG}
            skuNames={SKU_NAMES}
            onUpdate={items => handleUpdateBox(box.boxId, items)}
          />
        ))}

        <button
          onClick={handleAddBox}
          className="w-full border-2 border-dashed border-blue-300 hover:border-blue-500 text-blue-500 hover:text-blue-700 font-medium py-3 px-4 rounded-xl transition-colors bg-white"
        >
          + Добавить ещё коробку
        </button>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-3 space-y-2">
        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl shadow transition-all duration-150 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Формируем файл…
            </>
          ) : (
            '📄 Сформировать файл'
          )}
        </button>
      </div>
    </div>
  )
}
