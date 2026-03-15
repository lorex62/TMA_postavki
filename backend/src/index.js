process.stdout.write('[STARTUP] Node.js process started\n')

// ─── Barcode lookup ────────────────────────────────────────────────────────────
// Structure: BARCODE_MAP[sku][color || ''][size || ''] = barcode
const BARCODE_MAP = {
  'Напульсники': {
    'Чёрный':  { '': '2038390395824' },
    'Красный': { '': '2038417229514' },
    'Синий':   { '': '2038417275559' },
    'Голубой': { '': '2042220741965' },
    'Серый':   { '': '2038835197198' },
  },
  'Наколенники': {
    'Синий':   { '': '2039475767482' },
    'Красный': { '': '2039475767499' },
    'Серый':   { '': '2039475767505' },
    'Чёрный':  { '': '2039580105124' },
  },
  'Пуанты': {
    '': {
      '29': '2043097049130',
      '30': '2039329321556',
      '31': '2039329321563',
      '32': '2039329321570',
      '33': '2039329321587',
      '34': '2039329321594',
      '35': '2039329321600',
      '36': '2039329321617',
      '37': '2039329321624',
      '38': '2039329321631',
      '39': '2039329321648',
      '40': '2039329321655',
      '41': '2043097049147',
      '42': '2043097049154',
    },
  },
  'Скальники': {
    'Голубой': {
      '32': '2047260895791', '33': '2047260895807', '34': '2047260895814',
      '35': '2047260895821', '36': '2047260895838', '37': '2047260895845',
      '38': '2047260895852', '39': '2047260895869', '40': '2047260895876',
      '41': '2047260895883', '42': '2047260895890', '43': '2048491357843',
      '44': '2048491357850',
    },
    'Красный': {
      '32': '2048651231846', '33': '2048651231853', '34': '2048651231860',
      '35': '2048651231877', '36': '2048651231884', '37': '2048651231891',
      '38': '2048651231907', '39': '2048651231914', '40': '2048651231921',
      '41': '2048651231938', '42': '2048651231945', '43': '2048651231952',
      '44': '2048651231969',
    },
    'Фиолетовый': {
      '32': '2048651232034', '33': '2048651232041', '34': '2048651232058',
      '35': '2048651232065', '36': '2048651232072', '37': '2048651232089',
      '38': '2048651232096', '39': '2048651232102', '40': '2048651232119',
      '41': '2048651232126', '42': '2048651232133', '43': '2048651232140',
      '44': '2048651232157',
    },
  },
  'Спортивные наборы': {
    '': { '': '2039489796027' },
  },
}

/**
 * @param {string} sku
 * @param {string} color
 * @param {string} size
 * @returns {string|null}
 */
function lookupBarcode(sku, color, size) {
  const bySku = BARCODE_MAP[sku]
  if (!bySku) return null
  const byColor = bySku[color || '']
  if (!byColor) return null
  return byColor[size || ''] || null
}

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Telegraf } = require('telegraf')
const ExcelJS = require('exceljs')

process.stdout.write('[STARTUP] All modules loaded\n')

// ─── Config ───────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.BOT_TOKEN
const PORT = process.env.PORT || 3000

process.stdout.write(`[STARTUP] PORT=${PORT}, BOT_TOKEN=${BOT_TOKEN ? 'SET' : 'MISSING'}\n`)
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-webapp-url.com'

if (!BOT_TOKEN) {
  console.error('❌  BOT_TOKEN is not set. Please create a .env file (see .env.example).')
  process.exit(1)
}

// ─── Bot ──────────────────────────────────────────────────────────────────────

const bot = new Telegraf(BOT_TOKEN)

bot.command('start', ctx => {
  ctx.reply(
    '👋 Добро пожаловать!\n\nНажмите кнопку ниже, чтобы открыть приложение и сформировать файл поставки.',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📦 Открыть приложение',
              web_app: { url: WEBAPP_URL },
            },
          ],
        ],
      },
    },
  )
})

bot.catch((err, ctx) => {
  console.error(`[Bot error] ${ctx.updateType}`, err)
})

// ─── Express ──────────────────────────────────────────────────────────────────

const app = express()

app.use(cors())
app.use(express.json())

// Health-check
app.get('/health', (_req, res) => res.json({ ok: true }))

/**
 * POST /api/submit-delivery
 * Body: { boxes: Box[], userId: number }
 */
app.post('/api/submit-delivery', async (req, res) => {
  try {
    const { boxes, userId } = req.body

    // ── Validate ────────────────────────────────────────────────────────────
    if (!boxes || !Array.isArray(boxes)) {
      return res.status(400).json({ error: 'Поле boxes должно быть массивом.' })
    }
    if (!userId) {
      return res.status(400).json({ error: 'Поле userId обязательно.' })
    }

    // ── Aggregate: sum qty per barcode across all boxes ─────────────────────
    /** @type {Record<string, number>} */
    const aggregated = {}
    const unknownItems = []

    for (const box of boxes) {
      if (!Array.isArray(box.items)) continue
      for (const item of box.items) {
        const sku   = String(item.sku   || '').trim()
        const color = String(item.color || '').trim()
        const size  = String(item.size  || '').trim()
        const qty   = Number(item.qty) || 0
        if (!sku || qty <= 0) continue

        const barcode = lookupBarcode(sku, color, size)
        if (!barcode) {
          unknownItems.push(`${sku}${color ? ' / ' + color : ''}${size ? ' / р.' + size : ''}`)
          continue
        }
        aggregated[barcode] = (aggregated[barcode] || 0) + qty
      }
    }

    if (unknownItems.length > 0) {
      return res.status(400).json({
        error: `Не удалось найти баркод для: ${unknownItems.join(', ')}`,
      })
    }

    if (Object.keys(aggregated).length === 0) {
      return res.status(400).json({ error: 'Нет товаров с ненулевым количеством.' })
    }

    // ── Build Excel workbook ─────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'TMA Delivery Bot'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Поставка')

    // Column definitions
    sheet.columns = [
      { header: 'Баркод',     key: 'barcode', width: 22 },
      { header: 'Количество', key: 'qty',     width: 16 },
    ]

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, size: 12 }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD0E4FF' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 22

    // Data rows
    for (const [barcode, qty] of Object.entries(aggregated)) {
      const row = sheet.addRow({ barcode, qty })
      row.getCell('qty').alignment = { horizontal: 'center' }
    }

    // Border on all cells
    sheet.eachRow(row => {
      row.eachCell(cell => {
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FFAAAAAA' } },
          left:   { style: 'thin', color: { argb: 'FFAAAAAA' } },
          bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
          right:  { style: 'thin', color: { argb: 'FFAAAAAA' } },
        }
      })
    })

    // Write to buffer (no temp files)
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    // ── Send document to user via Telegram ───────────────────────────────────
    const skuCount = Object.keys(aggregated).length
    const totalQty = Object.values(aggregated).reduce((a, b) => a + b, 0)

    await bot.telegram.sendDocument(
      userId,
      { source: buffer, filename: 'Поставка.xlsx' },
      {
        caption:
          `📦 *Ваш файл поставки сформирован!*\n\n` +
          `• Уникальных артикулов: *${skuCount}*\n` +
          `• Общее кол-во единиц: *${totalQty}*`,
        parse_mode: 'Markdown',
      },
    )

    console.log(`[submit-delivery] Sent to userId=${userId}, SKUs=${skuCount}, totalQty=${totalQty}`)
    return res.json({ success: true })
  } catch (err) {
    console.error('[submit-delivery] Error:', err)
    return res.status(500).json({ error: 'Внутренняя ошибка сервера.' })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log('')
  console.log('─────────────────────────────────────────')
  console.log(`✅  Express server  →  http://0.0.0.0:${PORT}`)
  console.log(`🌐  WebApp URL      →  ${WEBAPP_URL}`)
  console.log('─────────────────────────────────────────')
  console.log('')
})

bot.launch()
  .then(() => console.log('🤖  Telegram bot    →  running (long-polling)'))
  .catch(err => console.error('❌  Bot launch failed (server still running):', err.message))

process.once('SIGINT',  () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
