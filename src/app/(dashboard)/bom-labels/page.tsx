'use client'

import { useState, useRef } from 'react'
import { FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ConsolidatedBreakup from '@/components/bom/consolidated-breakup'
import BomDownloads from '@/components/bom/bom-downloads'

// ── Types ────────────────────────────────────────────────────────────────────
type BomRow = {
  mpn       : string
  req_qty   : string
  send_qty  : string
  designator: string
  desc      : string
}

type SheetData = {
  headers: string[]
  rows   : any[][]
}

// ── Column mapping defaults (auto-detect by substring match) ─────────────────
const FIELD_LABELS: Record<keyof BomRow, string> = {
  mpn       : 'Manufacturer Part Number',
  req_qty   : 'Require Quantity',
  send_qty  : 'Send Quantity',
  designator: 'Designator',
  desc      : 'Description/value',
}

function autoDetect(headers: string[]): Partial<Record<keyof BomRow, number>> {
  const aliases: Record<keyof BomRow, string[]> = {
    mpn       : ['manufacturer part number', 'mpn', 'part number', 'mfr part'],
    req_qty   : ['required quantity', 'require quantity', 'req qty', 'required qty'],
    send_qty  : ['send quantity', 'send qty', 'sent quantity', 'sent qty'],
    designator: ['designator', 'reference', 'ref des', 'refdes'],
    desc      : ['description/value', 'description', 'value', 'desc'],
  }
  const result: Partial<Record<keyof BomRow, number>> = {}
  for (const [field, alts] of Object.entries(aliases)) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase().trim()
      if (alts.some(a => h.includes(a) || a.includes(h))) {
        result[field as keyof BomRow] = i
        break
      }
    }
  }
  return result
}

function applyMapping(sheetData: SheetData, mapping: Partial<Record<keyof BomRow, number>>): BomRow[] {
  const rows: BomRow[] = []
  for (const row of sheetData.rows) {
    const mpn = String(row[mapping.mpn ?? -1] ?? '').trim()
    if (!mpn) continue
    const rawReq  = row[mapping.req_qty   ?? -1]
    const rawSend = row[mapping.send_qty  ?? -1]
    rows.push({
      mpn,
      req_qty   : rawReq  !== '' && rawReq  != null ? String(typeof rawReq  === 'number' ? Math.round(rawReq)  : rawReq ).trim() : '',
      send_qty  : rawSend !== '' && rawSend != null ? String(typeof rawSend === 'number' ? Math.round(rawSend) : rawSend).trim() : '',
      designator: String(row[mapping.designator ?? -1] ?? '').trim(),
      desc      : String(row[mapping.desc       ?? -1] ?? '').trim(),
    })
  }
  return rows
}

// ── PDF generation ───────────────────────────────────────────────────────────
async function generatePdfBlob(rows: BomRow[], orderNo: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf')

  const PW = 210, PH = 297
  const LW     = 150
  const LX     = (PW - LW) / 2
  const BOTTOM = PH - 10
  const COL1   = 55
  const COL2   = LW - COL1
  const HDR_H  = 7
  const ROW_H  = 6
  const LINE_H = 4.2
  const PAD_X  = 2
  const PAD_Y  = 1.2
  const FSZ    = 11

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const wrap = (text: string, maxW: number): string[] => {
    doc.setFontSize(FSZ)
    return doc.splitTextToSize(String(text || ''), maxW)
  }

  const calcHeight = (item: BomRow): number => {
    const fields: [string, string][] = [
      ['Manufacturer Part Number', item.mpn],
      ['Require Quantity',         item.req_qty   || '—'],
      ['Send Quantity',            item.send_qty  || '—'],
      ['Designator',               item.designator],
      ['Description/value',        item.desc],
    ]
    let h = HDR_H
    for (const [lbl, val] of fields) {
      const n = Math.max(wrap(lbl, COL1 - PAD_X * 2).length, wrap(val, COL2 - PAD_X * 2).length)
      h += Math.max(ROW_H, n * LINE_H + PAD_Y * 2)
    }
    return h
  }

  const drawLabel = (item: BomRow, y: number) => {
    const fields: [string, string][] = [
      ['Manufacturer Part Number', item.mpn],
      ['Require Quantity',         item.req_qty   || '—'],
      ['Send Quantity',            item.send_qty  || '—'],
      ['Designator',               item.designator],
      ['Description/value',        item.desc],
    ]
    const rowHeights = fields.map(([lbl, val]) => {
      const n = Math.max(wrap(lbl, COL1 - PAD_X * 2).length, wrap(val, COL2 - PAD_X * 2).length)
      return Math.max(ROW_H, n * LINE_H + PAD_Y * 2)
    })
    let cy = y
    doc.setFillColor(31, 41, 55)
    doc.rect(LX, cy, LW, HDR_H, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(FSZ)
    const hw = doc.getTextWidth(`Order Number - ${orderNo}`)
    doc.text(`Order Number - ${orderNo}`, LX + (LW - hw) / 2, cy + HDR_H - 2.5)
    cy += HDR_H
    for (let i = 0; i < fields.length; i++) {
      const [lbl, val] = fields[i]
      const rh = rowHeights[i]
      doc.setFillColor(255, 255, 255)
      doc.rect(LX, cy, LW, rh, 'F')
      doc.setDrawColor(0); doc.setLineWidth(0.3)
      doc.line(LX, cy, LX + LW, cy)
      doc.line(LX + COL1, cy, LX + COL1, cy + rh)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(0); doc.setFontSize(FSZ)
      const lblLines = wrap(lbl, COL1 - PAD_X * 2)
      const lblH = lblLines.length * LINE_H
      const lblY = cy + (rh - lblH) / 2 + LINE_H * 0.75
      lblLines.forEach((ln: string, j: number) => doc.text(ln, LX + PAD_X, lblY + j * LINE_H))
      doc.setFont('helvetica', 'normal')
      const valLines = wrap(val, COL2 - PAD_X * 2)
      const valH = valLines.length * LINE_H
      const valY = cy + (rh - valH) / 2 + LINE_H * 0.75
      valLines.forEach((ln: string, j: number) => {
        const lw = doc.getTextWidth(ln)
        doc.text(ln, LX + COL1 + (COL2 - lw) / 2, valY + j * LINE_H)
      })
      cy += rh
    }
    const totalH = HDR_H + rowHeights.reduce((a, b) => a + b, 0)
    doc.setLineWidth(0.6)
    doc.rect(LX, y, LW, totalH, 'S')
  }

  let currY = 10, firstPage = true, countOnPage = 0
  for (const item of rows) {
    const h = calcHeight(item)
    if (!firstPage && (countOnPage >= 5 || currY + h > BOTTOM)) {
      doc.addPage(); currY = 10; countOnPage = 0
    }
    drawLabel(item, currY)
    currY += h; firstPage = false; countOnPage++
  }

  return doc.output('blob')
}

async function generatePdf(rows: BomRow[], orderNo: string): Promise<void> {
  const blob = await generatePdfBlob(rows, orderNo)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `BOM_Labels_${orderNo}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
export default function BomLabelsPage() {
  const fileRef     = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'labels' | 'consolidated' | 'downloads'>('labels')

  // ── BOM Labels state ──
  const [sheetData,  setSheetData]  = useState<SheetData | null>(null)
  const [mapping,    setMapping]    = useState<Partial<Record<keyof BomRow, number>>>({})
  const [rows,       setRows]       = useState<BomRow[]>([])
  const [orderNo,    setOrderNo]    = useState('')
  const [fileName,   setFileName]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // ── Consolidated state ──

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  // ── BOM Labels handlers ──
  const handleFile = async (f: File) => {
    setError(null); setSheetData(null); setRows([]); setFileName(f.name); setLoading(true)
    try {
      // @ts-ignore
      const XLSX = await import('xlsx')
      const buf  = await f.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array', cellFormula: false, raw: true })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })
      let headerIdx = 0
      for (let i = 0; i < Math.min(10, raw.length); i++) {
        if (raw[i].filter((c: any) => c !== '').length >= 3) { headerIdx = i; break }
      }
      const headers  = raw[headerIdx].map((h: any) => String(h ?? '').trim()).filter(Boolean)
      const dataRows = raw.slice(headerIdx + 1).filter(r => r.some((c: any) => c !== '' && c != null))
      const sd: SheetData = { headers, rows: dataRows }
      setSheetData(sd)
      const detected = autoDetect(headers)
      setMapping(detected)
      setRows(applyMapping(sd, detected))
    } catch (e: any) { setError(e.message ?? 'Failed to read file') }
    setLoading(false)
  }

  const handleMappingChange = (field: keyof BomRow, colIdx: number) => {
    const nm = { ...mapping, [field]: colIdx === -1 ? undefined : colIdx }
    setMapping(nm)
    if (sheetData) setRows(applyMapping(sheetData, nm))
  }

  const handleGenerate = async () => {
    if (!rows.length || !orderNo.trim()) return
    setGenerating(true)
    try {
      // Generate PDF blob and save to Supabase Storage
      const blob = await generatePdfBlob(rows, orderNo.trim())
      const fileName = `BOM_Labels_${orderNo.trim()}_${Date.now()}.pdf`

      // Download to browser
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href    = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)

      // Save to Supabase Storage
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      await sb.storage.from('bom-outputs').upload(fileName, blob, { contentType: 'application/pdf' })
    }
    catch (e: any) { setError(e.message) }
    setGenerating(false)
  }

  const allMapped = (Object.keys(FIELD_LABELS) as (keyof BomRow)[]).every(f => mapping[f] !== undefined)

  const TABS = [
    { id: 'labels',       label: 'BOM Labels'           },
    { id: 'consolidated', label: 'Consolidated Breakup' },
    { id: 'downloads',    label: 'Downloads'             },
  ]

  return (
    <div className="min-h-screen grid-bg animate-fade-up">
      {/* Header */}
      <div className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
            <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>BOM Tools</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Label generator & DHL consolidated breakup
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 py-6 max-w-4xl space-y-6">

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}>
          {TABS.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                color     : activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ BOM LABELS TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'labels' && (
          <div className="space-y-6">

            {/* Upload */}
            <div
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-10 gap-3"
              style={{
                borderColor: sheetData ? 'var(--accent-border)' : 'var(--border-dim)',
                background : sheetData ? 'var(--accent-soft)' : 'var(--bg-card)',
              }}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <FileSpreadsheet className="w-8 h-8 opacity-40" style={{ color: 'var(--accent)' }} />
              {sheetData
                ? <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{fileName} — {rows.length} components</p>
                : <>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Drop Excel BOM here or click to browse</p>
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>.xlsx or .xls</p>
                  </>
              }
              {loading && <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Reading…</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Column mapping */}
            {sheetData && (
              <div className="rounded-2xl border overflow-hidden"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                <div className="px-5 py-4 border-b flex items-center justify-between"
                  style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Column Mapping</p>
                  {allMapped && (
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98130' }}>
                      <CheckCircle2 className="w-3 h-3" /> All mapped
                    </span>
                  )}
                </div>
                <div className="p-5 space-y-3">
                  {(Object.keys(FIELD_LABELS) as (keyof BomRow)[]).map(field => (
                    <div key={field} className="flex items-center gap-3">
                      <p className="text-sm font-semibold w-52 shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {FIELD_LABELS[field]}
                      </p>
                      <select value={mapping[field] ?? -1}
                        onChange={e => handleMappingChange(field, parseInt(e.target.value))}
                        className="flex-1 h-9 px-3 border rounded-lg text-sm" style={inputStyle}>
                        <option value={-1}>— not mapped —</option>
                        {sheetData.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                      {mapping[field] !== undefined
                        ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#10b981' }} />
                        : <AlertCircle  className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {rows.length > 0 && (
              <div className="rounded-2xl border overflow-hidden"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                <div className="px-5 py-3 border-b"
                  style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Preview — first 3 rows</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-dim)' }}>
                        {['MPN', 'Req Qty', 'Send Qty', 'Designator', 'Description'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-dim)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 3).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                          <td className="px-3 py-2 font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{row.mpn}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{row.req_qty}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{row.send_qty}</td>
                          <td className="px-3 py-2 max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>{row.designator}</td>
                          <td className="px-3 py-2 max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>{row.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Generate */}
            {rows.length > 0 && (
              <div className="rounded-2xl border p-5 space-y-4"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>Order Number</Label>
                  <Input placeholder="e.g. LOIO-260267-A" value={orderNo}
                    onChange={e => setOrderNo(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleGenerate() }}
                    className="h-10 border rounded-lg text-sm" style={inputStyle} />
                </div>
                <button onClick={handleGenerate}
                  disabled={generating || !orderNo.trim() || !allMapped}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  <Download className="w-4 h-4" />
                  {generating ? 'Generating…' : `Download Labels PDF — ${rows.length} components`}
                </button>
                {!allMapped && (
                  <p className="text-xs text-center" style={{ color: '#f59e0b' }}>Map all columns above to enable download</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ CONSOLIDATED BREAKUP TAB ════════════════════════════════════════ */}
        {activeTab === 'consolidated' && (
          <ConsolidatedBreakup />
        )}

        {activeTab === 'downloads' && (
          <BomDownloads />
        )}
      </div>
    </div>
  )
}