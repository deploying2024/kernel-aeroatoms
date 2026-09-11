import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { verifyUrl } from './serials'

const MM     = 2.8346
const LW     = 45 * MM   // label width
const LH     = 16 * MM   // label height
const COLS   = 4
const MARGIN = 10 * MM
const GAP    = 4 * MM

export async function buildLabelPdf(serials: string[]): Promise<Uint8Array> {
  const pdf  = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.CourierBold)
  const mono = await pdf.embedFont(StandardFonts.Courier)

  const pw = 595.28   // A4 width pts
  const ph = 841.89   // A4 height pts

  const usableH = ph - 2 * MARGIN
  const rows    = Math.floor((usableH + GAP) / (LH + GAP))
  const perPage = COLS * rows

  let page = pdf.addPage([pw, ph])

  for (let i = 0; i < serials.length; i++) {
    if (i > 0 && i % perPage === 0) page = pdf.addPage([pw, ph])

    const idx = i % perPage
    const col = idx % COLS
    const row = Math.floor(idx / COLS)
    const x   = MARGIN + col * (LW + GAP)
    const y   = ph - MARGIN - (row + 1) * LH - row * GAP

    const serial = serials[i]
    const url    = verifyUrl(serial)

    // QR code
    const png   = await QRCode.toBuffer(url, {
      errorCorrectionLevel: 'M',
      margin : 1,
      width  : 160,
    })
    const img   = await pdf.embedPng(png)
    const qrSz  = LH - 3 * MM

    // Label border
    page.drawRectangle({
      x, y,
      width      : LW,
      height     : LH,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.4,
    })

    // QR image
    page.drawImage(img, {
      x     : x + 1.5 * MM,
      y     : y + 1.5 * MM,
      width : qrSz,
      height: qrSz,
    })

    // Serial text — split into 2 lines
    const parts = serial.split('-')
    const line1 = parts.slice(0, 3).join('-')  // ORB-NEO-2609
    const line2 = parts.slice(3).join('-')     // A7K3Q9-3F1C

    const textX = x + qrSz + 3.5 * MM
    const midY  = y + LH / 2

    page.drawText(line1, {
      x   : textX,
      y   : midY + 1.5,
      size: 6,
      font,
      color: rgb(0.1, 0.1, 0.1),
    })
    page.drawText(line2, {
      x   : textX,
      y   : midY - 6,
      size: 6,
      font: mono,
      color: rgb(0.3, 0.3, 0.3),
    })

    // "AeroAtoms" micro branding
    page.drawText('AeroAtoms', {
      x   : textX,
      y   : y + 2.5,
      size: 4.5,
      font: mono,
      color: rgb(0.6, 0.6, 0.6),
    })
  }

  return pdf.save()
}