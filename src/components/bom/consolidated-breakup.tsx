'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Upload, Plus, X, AlertCircle, Settings, CheckCircle2 } from 'lucide-react'

type Category = { id: string; name: string; sort_order: number }

type PackingItem = {
  id        : number
  name      : string
  qty       : number
  desc      : string
  category  : string
  unitPrice : number   // always a number internally
}

// ── Column mapping state after Excel upload ──────────────────────────────────
type ColMap = {
  name     : number
  qty      : number
  desc     : number
  unitPrice: number
}

type ShipmentMeta = { awb: string; invoice: string; date: string }

async function downloadXlsx(
  items     : PackingItem[],
  categories: Category[],
  meta      : ShipmentMeta,
) {
  // @ts-ignore
  const XLSX = await import('xlsx-js-style')
  const grouped: Record<string, PackingItem[]> = {}
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  }

  const consolidatedRows: any[][] = []
  let sl = 1
  for (const cat of categories.map(c => c.name)) {
    if (!grouped[cat]) continue
    const catItems = grouped[cat]
    const qty    = catItems.reduce((s, i) => s + (i.qty || 0), 0)
    const amount = catItems.reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0)
    const price  = qty > 0 ? amount / qty : 0
    consolidatedRows.push([
      sl++, cat, qty,
      price  > 0 ? `$${price.toFixed(2)}`  : '',
      amount > 0 ? `$${amount.toFixed(2)}` : '',
    ])
  }

  const totalQty    = items.reduce((s, i) => s + (i.qty || 0), 0)
  const totalAmount = items.reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0)

  // ── Left side: packing list (cols A–F) ──────────────────────────────────
  // Col offsets: A=0 B=1 C=2 D=3 E=4 F=5   G=6 (gap)   H=7 I=8 J=9 K=10 L=11
  const LEFT_COLS  = 6
  const GAP_COLS   = 1   // col G is empty
  const RIGHT_OFF  = LEFT_COLS + GAP_COLS  // col H = index 7

  // Build the full sheet as array of arrays
  const maxRows = Math.max(
    6 + items.length + 2,        // packing list rows
    5 + consolidatedRows.length + 2  // consolidated rows
  )

  const grid: any[][] = Array.from({ length: maxRows }, () => Array(RIGHT_OFF + 6).fill(''))

  // Header rows (left)
  grid[0][0] = `DHL AWB# ${meta.awb}`
  grid[1][0] = `DIGI-KEY ELECTRONICS Invoice no. ${meta.invoice}`
  grid[3][0] = `Date: ${meta.date}`

  // Packing list header row
  const PLH = 5
  grid[PLH][0] = 'SlNo'
  grid[PLH][1] = 'Part Number'
  grid[PLH][2] = 'Description'
  grid[PLH][3] = 'Qty'
  grid[PLH][4] = 'Unit Price USD'
  grid[PLH][5] = 'Amount in USD'

  // Packing list data rows
  items.forEach((item, i) => {
    const r = PLH + 1 + i
    grid[r][0] = i + 1
    grid[r][1] = item.name
    grid[r][2] = item.desc
    grid[r][3] = item.qty
    grid[r][4] = item.unitPrice > 0 ? `$${item.unitPrice.toFixed(2)}` : ''
    grid[r][5] = item.unitPrice > 0 ? `$${(item.qty * item.unitPrice).toFixed(2)}` : ''
  })

  // Packing list totals
  const plTotalRow = PLH + 1 + items.length
  grid[plTotalRow][3] = totalQty
  grid[plTotalRow][5] = totalAmount > 0 ? `$${totalAmount.toFixed(2)}` : ''

  // ── Right side: consolidated breakup (cols H–L) ──────────────────────────
  const CH = 2   // consolidated header row index
  grid[CH][RIGHT_OFF]     = 'MERGED Excel'
  grid[CH + 1][RIGHT_OFF] = ''

  const CBH = CH + 1
  grid[CBH][RIGHT_OFF]     = 'Consolidated breakup'  // merged across H..L

  const HDR = CBH + 1
  grid[HDR][RIGHT_OFF]     = 'SI no'
  grid[HDR][RIGHT_OFF + 1] = 'Description'
  grid[HDR][RIGHT_OFF + 2] = 'Qty'
  grid[HDR][RIGHT_OFF + 3] = 'Unit price in'
  grid[HDR][RIGHT_OFF + 4] = 'Amount in'

  consolidatedRows.forEach((row, i) => {
    const r = HDR + 1 + i
    grid[r][RIGHT_OFF]     = row[0]
    grid[r][RIGHT_OFF + 1] = row[1]
    grid[r][RIGHT_OFF + 2] = row[2]
    grid[r][RIGHT_OFF + 3] = row[3]
    grid[r][RIGHT_OFF + 4] = row[4]
  })

  const totalRow = HDR + 1 + consolidatedRows.length
  grid[totalRow][RIGHT_OFF + 1] = 'Total USD'
  grid[totalRow][RIGHT_OFF + 2] = totalQty
  grid[totalRow][RIGHT_OFF + 4] = totalAmount > 0 ? `$${totalAmount.toFixed(2)}` : ''

  // ── Build worksheet ──────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(grid)

  ws['!cols'] = [
    { wch: 8  },  // A SlNo
    { wch: 22 },  // B Part Number
    { wch: 35 },  // C Description
    { wch: 8  },  // D Qty
    { wch: 14 },  // E Unit Price
    { wch: 14 },  // F Amount
    { wch: 4  },  // G Gap
    { wch: 8  },  // H SI no
    { wch: 26 },  // I Description
    { wch: 8  },  // J Qty
    { wch: 14 },  // K Unit price
    { wch: 12 },  // L Amount
  ]

  // Merge "Consolidated breakup" header across H..L
  ws['!merges'] = [
    { s: { r: CBH, c: RIGHT_OFF }, e: { r: CBH, c: RIGHT_OFF + 4 } },
  ]

  // ── Cell styling ─────────────────────────────────────────────────────────
  const thinBorder = {
    top   : { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left  : { style: 'thin', color: { rgb: '000000' } },
    right : { style: 'thin', color: { rgb: '000000' } },
  }

  const blueHeader = {
    fill : { fgColor: { rgb: '1F497D' } },
    font : { bold: true, color: { rgb: 'FFFFFF' }, sz: 12, name: 'Arial' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder,
  }

  const lightBlueRow = {
    fill  : { fgColor: { rgb: 'DCE6F1' } },
    font  : { bold: true, sz: 12, name: 'Arial' },
    border: thinBorder,
  }

  const normalCell = {
    font  : { sz: 12, name: 'Arial' },
    border: thinBorder,
    alignment: { vertical: 'center' },
  }

  const totalRowStyle = {
    fill  : { fgColor: { rgb: 'DCE6F1' } },
    font  : { bold: true, sz: 12, name: 'Arial' },
    border: thinBorder,
  }

  const toCol = (n: number) => String.fromCharCode(65 + n)
  const cellRef = (r: number, c: number) => `${toCol(c)}${r + 1}`

  const setStyle = (r: number, c: number, style: any) => {
    const ref = cellRef(r, c)
    if (!ws[ref]) ws[ref] = { v: '', t: 's' }
    ws[ref].s = style
  }

  // Style packing list header row
  for (let c = 0; c < 6; c++) setStyle(PLH, c, blueHeader)

  // Style packing list data rows
  for (let i = 0; i < items.length; i++) {
    for (let c = 0; c < 6; c++) setStyle(PLH + 1 + i, c, normalCell)
  }

  // Style packing list total row
  for (let c = 0; c < 6; c++) setStyle(plTotalRow, c, totalRowStyle)

  // Style "MERGED Excel" label (yellow highlight)
  const mergedCell = ws[cellRef(CH, RIGHT_OFF)]
  if (mergedCell) mergedCell.s = {
    fill: { fgColor: { rgb: 'FFFF00' } },
    font: { bold: true, sz: 9 },
    border: thinBorder,
  }

  // Style "Consolidated breakup" merged header
  for (let c = RIGHT_OFF; c <= RIGHT_OFF + 4; c++) {
    setStyle(CBH, c, blueHeader)
  }

  // Style consolidated column headers
  for (let c = RIGHT_OFF; c <= RIGHT_OFF + 4; c++) {
    setStyle(HDR, c, blueHeader)
  }

  // Style consolidated data rows (alternating)
  consolidatedRows.forEach((_, i) => {
    const style = i % 2 === 0 ? normalCell : { ...normalCell, fill: { fgColor: { rgb: 'F2F2F2' } } }
    for (let c = RIGHT_OFF; c <= RIGHT_OFF + 4; c++) {
      setStyle(HDR + 1 + i, c, style)
    }
  })

  // Style consolidated total row
  for (let c = RIGHT_OFF; c <= RIGHT_OFF + 4; c++) {
    setStyle(totalRow, c, totalRowStyle)
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Packing List')
  XLSX.writeFile(wb, `DHL_${meta.awb || 'breakup'}.xlsx`)
}

// ── Auto-detect column indices ───────────────────────────────────────────────
function autoDetectCols(headers: string[]): Partial<ColMap> {
  const map: Partial<ColMap> = {}
  const match = (h: string, aliases: string[]) =>
    aliases.some(a => h.includes(a) || a.includes(h))

  headers.forEach((h, i) => {
    const hl = h.toLowerCase().trim()
    if (!map.name     && match(hl, ['name', 'description', 'part', 'item', 'component', 'mpn'])) map.name = i
    if (!map.qty      && match(hl, ['qty', 'quantity', 'send qty', 'send quantity']))             map.qty = i
    if (!map.desc     && map.name !== i && match(hl, ['desc', 'value', 'specification']))         map.desc = i
    if (!map.unitPrice && match(hl, ['unit price', 'price', 'rate', 'cost', 'usd', 'unit cost'])) map.unitPrice = i
  })
  return map
}

export default function ConsolidatedBreakup() {
  const packFileRef = useRef<HTMLInputElement>(null)

  const [categories,  setCategories]  = useState<Category[]>([])
  const [catLoading,  setCatLoading]  = useState(true)
  const [showCatMgr,  setShowCatMgr]  = useState(false)
  const [newCatName,  setNewCatName]  = useState('')
  const [addingCat,   setAddingCat]   = useState(false)

  const [rawHeaders,  setRawHeaders]  = useState<string[]>([])
  const [rawRows,     setRawRows]     = useState<any[][]>([])
  const [colMap,      setColMap]      = useState<Partial<ColMap>>({})
  const [showColMap,  setShowColMap]  = useState(false)

  const [items,       setItems]       = useState<PackingItem[]>([])
  const [orderNo,     setOrderNo]     = useState('')
  const [packLoading, setPackLoading] = useState(false)
  const [packError,   setPackError]   = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [meta, setMeta] = useState<{ awb: string; invoice: string; date: string }>({
    awb: '', invoice: '', date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  })

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  // Load categories from DB
  useEffect(() => {
    const sb = createClient()
    sb.from('breakup_categories')
      .select('id, name, sort_order')
      .order('sort_order')
      .then(({ data }) => { setCategories(data ?? []); setCatLoading(false) })
  }, [])

  // Re-apply column mapping when colMap changes
  const applyColMap = (rows: any[][], map: Partial<ColMap>, cats: Category[]) => {
    return rows
      .filter(r => map.name !== undefined && r[map.name!] !== '' && r[map.name!] != null)
      .map((r, i) => ({
        id       : i,
        name     : String(r[map.name!] ?? '').trim(),
        qty      : map.qty !== undefined
          ? (typeof r[map.qty] === 'number' ? Math.round(r[map.qty]) : parseInt(String(r[map.qty] || '1')) || 1)
          : 1,
        desc     : map.desc !== undefined ? String(r[map.desc] ?? '').trim() : '',
        category : cats[0]?.name ?? '',
        unitPrice: map.unitPrice !== undefined
          ? (typeof r[map.unitPrice] === 'number' ? r[map.unitPrice] : parseFloat(String(r[map.unitPrice] || '0')) || 0)
          : 0,
      }))
      .filter(it => it.name)
  }

  const handleColMapChange = (field: keyof ColMap, idx: number) => {
    const newMap = { ...colMap, [field]: idx === -1 ? undefined : idx }
    setColMap(newMap)
    setItems(applyColMap(rawRows, newMap, categories))
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const sb = createClient()
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0
    const { data } = await sb
      .from('breakup_categories')
      .insert({ name: newCatName.trim(), sort_order: maxOrder + 1 })
      .select().single()
    if (data) setCategories(prev => [...prev, data])
    setNewCatName('')
    setAddingCat(false)
  }

  const deleteCategory = async (id: string) => {
    const sb = createClient()
    await sb.from('breakup_categories').delete().eq('id', id)
    const remaining = categories.filter(c => c.id !== id)
    const deletedName = categories.find(c => c.id === id)?.name
    setCategories(remaining)
    if (deletedName && remaining.length > 0) {
      setItems(prev => prev.map(it =>
        it.category === deletedName ? { ...it, category: remaining[0].name } : it
      ))
    }
  }

  const handlePackFile = async (f: File) => {
    setPackError(null)
    setItems([])
    setRawHeaders([])
    setRawRows([])
    setPackLoading(true)
    try {
      // @ts-ignore
      const XLSX = await import('xlsx')
      const buf  = await f.arrayBuffer()
      const isCSV = f.name.toLowerCase().endsWith('.csv')
      const wb   = isCSV
        ? XLSX.read(await f.text(), { type: 'string' })
        : XLSX.read(buf, { type: 'array', cellFormula: false, raw: true })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })

      let headerIdx = 0
      for (let i = 0; i < Math.min(10, raw.length); i++) {
        if (raw[i].filter((c: any) => c !== '').length >= 2) { headerIdx = i; break }
      }

      const headers  = raw[headerIdx].map((h: any) => String(h ?? '').trim())
      const dataRows = raw.slice(headerIdx + 1).filter(r => r.some((c: any) => c !== '' && c != null))
      // Note: CSV files are read by xlsx automatically via XLSX.read

      const detected = autoDetectCols(headers)
      setRawHeaders(headers)
      setRawRows(dataRows)
      setColMap(detected)
      setShowColMap(true)
      setItems(applyColMap(dataRows, detected, categories))
    } catch (e: any) {
      setPackError(e.message ?? 'Failed to read file')
    }
    setPackLoading(false)
  }

  const updateItem = (id: number, field: keyof PackingItem, value: any) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))

  const removeItem = (id: number) =>
    setItems(prev => prev.filter(it => it.id !== id))

  const addManualItem = () =>
    setItems(prev => [...prev, {
      id: Date.now(), name: '', qty: 1, desc: '',
      category: categories[0]?.name ?? '', unitPrice: 0,
    }])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadXlsx(items, categories, meta)

      // Save a copy to Supabase Storage
      try {
        // @ts-ignore
        const XLSX = await import('xlsx-js-style')
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const fileName = `DHL_${meta.awb || 'breakup'}_${Date.now()}.xlsx`
        // Re-generate minimal workbook for storage record
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`DHL AWB# ${meta.awb}`, `Invoice: ${meta.invoice}`, `Date: ${meta.date}`]]), 'Info')
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
        await sb.storage.from('bom-outputs').upload(
          fileName,
          new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        )
      } catch (_) { /* Storage save is best-effort */ }
    }
    catch (e: any) { setPackError(e.message) }
    setDownloading(false)
  }

  // Consolidated preview
  const consolidated = categories
    .map(cat => {
      const catItems = items.filter(i => i.category === cat.name)
      if (!catItems.length) return null
      const qty    = catItems.reduce((s, i) => s + (i.qty || 0), 0)
      const amount = catItems.reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0)
      const price  = qty > 0 ? amount / qty : 0
      return { name: cat.name, qty, price, amount }
    })
    .filter(Boolean) as { name: string; qty: number; price: number; amount: number }[]

  const totalQty    = consolidated.reduce((s, r) => s + r.qty, 0)
  const totalAmount = consolidated.reduce((s, r) => s + r.amount, 0)

  const COL_FIELDS: { key: keyof ColMap; label: string }[] = [
    { key: 'name',      label: 'Component Name' },
    { key: 'qty',       label: 'Quantity'        },
    { key: 'desc',      label: 'Description'     },
    { key: 'unitPrice', label: 'Unit Price (USD)' },
  ]

  return (
    <div className="space-y-6">

      {/* Category manager */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Categories</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Stored in DB — shared across all shipments
            </p>
          </div>
          <button onClick={() => setShowCatMgr(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold"
            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
            <Settings className="w-3.5 h-3.5" />
            {showCatMgr ? 'Close' : 'Manage'}
          </button>
        </div>
        <div className="px-5 py-3 flex flex-wrap gap-2">
          {catLoading
            ? <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Loading…</p>
            : categories.map(cat => (
              <div key={cat.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                {cat.name}
                {showCatMgr && (
                  <button onClick={() => deleteCategory(cat.id)}
                    style={{ color: '#ef4444' }}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))
          }
        </div>
        {showCatMgr && (
          <div className="px-5 pb-4 flex gap-2">
            <Input placeholder="New category name…" value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCategory() }}
              className="h-9 border rounded-lg text-sm" style={inputStyle} />
            <button onClick={addCategory} disabled={addingCat || !newCatName.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              {addingCat ? '…' : 'Add'}
            </button>
          </div>
        )}
      </div>

      {/* Upload */}
      <div className="rounded-2xl border p-5 space-y-4"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Packing List</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Upload Excel — columns are auto-detected, then you can adjust the mapping
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => packFileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold"
            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
            <Upload className="w-4 h-4" /> Upload Excel
          </button>
          <button onClick={addManualItem}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
            <Plus className="w-4 h-4" /> Add Item
          </button>
          <input ref={packFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePackFile(f) }} />
        </div>
        {packLoading && <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Reading file…</p>}
        {packError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <p className="text-xs">{packError}</p>
          </div>
        )}
      </div>

      {/* Column mapping — shown after upload */}
      {rawHeaders.length > 0 && showColMap && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Column Mapping</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Map Excel columns — unit price is auto-calculated as qty × unit price
            </p>
          </div>
          <div className="p-5 space-y-3">
            {COL_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <p className="text-sm font-semibold w-40 shrink-0" style={{ color: 'var(--text-primary)' }}>
                  {label}
                </p>
                <select
                  value={colMap[key] ?? -1}
                  onChange={e => handleColMapChange(key, parseInt(e.target.value))}
                  className="flex-1 h-9 px-3 border rounded-lg text-sm"
                  style={inputStyle}>
                  <option value={-1}>— not mapped —</option>
                  {rawHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
                {colMap[key] !== undefined
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#10b981' }} />
                  : <AlertCircle  className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items table */}
      {items.length > 0 && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
          <div className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {items.length} Components
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Set category for each — unit price & amount are calculated automatically
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-dim)' }}>
                  {['Name', 'Description', 'Qty', 'Category', 'Unit Price ($)', 'Amount ($)', ''].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <td className="px-3 py-2">
                      <input value={item.name}
                        onChange={e => updateItem(item.id, 'name', e.target.value)}
                        className="w-full bg-transparent border-b text-xs outline-none"
                        style={{ borderColor: 'var(--border-dim)', color: 'var(--text-primary)', minWidth: 120 }} />
                    </td>
                    <td className="px-3 py-2">
                      <input value={item.desc}
                        onChange={e => updateItem(item.id, 'desc', e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent border-b text-xs outline-none"
                        style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)', minWidth: 100 }} />
                    </td>
                    <td className="px-3 py-2 w-16">
                      <input type="number" min={1} value={item.qty}
                        onChange={e => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                        className="w-full bg-transparent border-b text-xs outline-none text-center"
                        style={{ borderColor: 'var(--border-dim)', color: 'var(--text-primary)' }} />
                    </td>
                    <td className="px-3 py-2">
                      <select value={item.category}
                        onChange={e => updateItem(item.id, 'category', e.target.value)}
                        className="w-full h-7 px-2 border rounded text-xs"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-dim)', color: 'var(--text-primary)', minWidth: 160 }}>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 w-28">
                      <div className="flex items-center gap-1">
                        <span style={{ color: 'var(--text-dim)' }}>$</span>
                        <input type="number" min={0} step={0.01} value={item.unitPrice}
                          onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border-b text-xs outline-none"
                          style={{ borderColor: 'var(--border-dim)', color: 'var(--text-primary)' }} />
                      </div>
                    </td>
                    <td className="px-3 py-2 w-24 text-right font-semibold"
                      style={{ color: 'var(--accent)' }}>
                      ${(item.qty * item.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 w-8">
                      <button onClick={() => removeItem(item.id)} style={{ color: '#ef4444' }}>
                        <X className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--border-dim)' }}>
            <button onClick={addManualItem} className="text-xs font-semibold"
              style={{ color: 'var(--accent)' }}>
              + Add another item
            </button>
          </div>
        </div>
      )}

      {/* Consolidated preview */}
      {consolidated.length > 0 && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
          <div className="px-5 py-3 border-b"
            style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Consolidated Preview</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-dim)' }}>
                  {['Sl no', 'Description', 'Qty', 'Unit Price (USD)', 'Amount (USD)'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {consolidated.map((r, i) => (
                  <tr key={r.name} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{r.qty}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {r.price > 0 ? `$${r.price.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {r.amount > 0 ? `$${r.amount.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-dim)' }}>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>Total USD</td>
                  <td className="px-3 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>{totalQty}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 font-bold" style={{ color: 'var(--accent)' }}>
                    ${totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Download */}
      {items.length > 0 && (
        <div className="rounded-2xl border p-5 space-y-4"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Shipment Details</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>DHL AWB #</Label>
              <Input placeholder="e.g. 2264062983" value={meta.awb}
                onChange={e => setMeta(m => ({ ...m, awb: e.target.value }))}
                className="h-10 border rounded-lg text-sm" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Invoice Number</Label>
              <Input placeholder="e.g. 132202570" value={meta.invoice}
                onChange={e => setMeta(m => ({ ...m, invoice: e.target.value }))}
                className="h-10 border rounded-lg text-sm" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Date</Label>
              <Input placeholder="e.g. 9th September 2026" value={meta.date}
                onChange={e => setMeta(m => ({ ...m, date: e.target.value }))}
                className="h-10 border rounded-lg text-sm" style={inputStyle} />
            </div>
          </div>
          <button onClick={handleDownload} disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <Download className="w-4 h-4" />
            {downloading ? 'Generating…' : 'Download Merged Excel (.xlsx)'}
          </button>
        </div>
      )}
    </div>
  )
}