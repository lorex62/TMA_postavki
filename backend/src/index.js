require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Telegraf } = require('telegraf')
const ExcelJS = require('exceljs')

// ─── Config ───────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.BOT_TOKEN
const PORT = process.env.PORT || 3000
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

    // ── Aggregate: sum qty per SKU across all boxes ──────────────────────────
    /** @type {Record<string, number>} */
    const aggregated = {}

    for (const box of boxes) {
      if (!Array.isArray(box.items)) continue
      for (const item of box.items) {
        const sku = String(item.sku || '').trim()
        const qty = Number(item.qty) || 0
        if (sku && qty > 0) {
          aggregated[sku] = (aggregated[sku] || 0) + qty
        }
      }
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
      { header: 'Артикул',          key: 'sku', width: 22 },
      { header: 'Общее количество', key: 'qty', width: 20 },
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
    for (const [sku, qty] of Object.entries(aggregated)) {
      const row = sheet.addRow({ sku, qty })
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

bot.launch()

app.listen(PORT, () => {
  console.log('')
  console.log('─────────────────────────────────────────')
  console.log(`✅  Express server  →  http://localhost:${PORT}`)
  console.log(`🤖  Telegram bot    →  running (long-polling)`)
  console.log(`🌐  WebApp URL      →  ${WEBAPP_URL}`)
  console.log('─────────────────────────────────────────')
  console.log('')
})

process.once('SIGINT',  () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
