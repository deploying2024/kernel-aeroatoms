'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Plus, Trash2, Save, X,
  CalendarIcon, Building2, Search,
  UserCheck, UserPlus, ChevronDown,
  FileText, Truck,
} from 'lucide-react'
import { generateInvoiceHTML, type PrintOptions } from './invoice-pdf'

type LineItem = {
  description    : string
  type_of_packing: string
  quantity       : string
  unit_value     : string
}

type Sender = {
  name: string; address: string
  city: string; phone: string; email: string; gstin?: string
}

type AddressEntry = {
  id               : string
  recipient_name   : string
  recipient_company: string | null
  recipient_address: string
  recipient_city   : string
  recipient_pincode: string
  recipient_phone  : string
}

export type PrintOptions_ = PrintOptions

const emptyLine = (): LineItem => ({
  description    : '',
  type_of_packing: 'Box',
  quantity       : '1',
  unit_value     : '',
})

function LineItemRow({
  item, idx, onChange, onRemove, canRemove,
}: {
  item     : LineItem
  idx      : number
  onChange : (p: Partial<LineItem>) => void
  onRemove : () => void
  canRemove: boolean
}) {
  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }
  const total = (parseInt(item.quantity) || 0) * (parseFloat(item.unit_value) || 0)

  return (
    <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
      <td className="px-3 py-2 text-xs text-center align-middle"
        style={{ color: 'var(--text-dim)', width: 36 }}>{idx + 1}</td>
      <td className="px-2 py-2 align-middle" style={{ width: 90 }}>
        <Input placeholder="Box" value={item.type_of_packing}
          onChange={e => onChange({ type_of_packing: e.target.value })}
          className="h-9 border rounded-lg text-sm" style={inputStyle} />
      </td>
      <td className="px-2 py-2 align-middle">
        <Input placeholder="Electronics Device" value={item.description}
          onChange={e => onChange({ description: e.target.value })}
          className="h-9 border rounded-lg text-sm" style={inputStyle} />
      </td>
      <td className="px-2 py-2 align-middle" style={{ width: 80 }}>
        <Input type="number" min={1} placeholder="1" value={item.quantity}
          onChange={e => onChange({ quantity: e.target.value })}
          className="h-9 border rounded-lg text-sm text-right" style={inputStyle} />
      </td>
      <td className="px-2 py-2 align-middle" style={{ width: 110 }}>
        <Input type="number" min={0} placeholder="0" value={item.unit_value}
          onChange={e => onChange({ unit_value: e.target.value })}
          className="h-9 border rounded-lg text-sm text-right" style={inputStyle} />
      </td>
      <td className="px-3 py-2 text-right text-sm font-bold align-middle"
        style={{ color: 'var(--accent)', width: 100 }}>
        {total > 0 ? `₹${total.toLocaleString()}` : '—'}
      </td>
      <td className="px-2 py-2 align-middle" style={{ width: 44 }}>
        {canRemove && (
          <button onClick={onRemove}
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
            style={{ borderColor: 'var(--border-dim)', color: '#ef4444' }}
            onMouseEnter={e => { ;(e.currentTarget as HTMLElement).style.background = '#ef444410' }}
            onMouseLeave={e => { ;(e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  )
}

export default function InvoiceForm({
  sender,
  logoUrl,
  onClose,
  onSaveAndPrint,
}: {
  sender        : Sender
  logoUrl       : string
  onClose       : () => void
  onSaveAndPrint: (invoice: any, opts: PrintOptions) => void
}) {
  const router = useRouter()

  // ── Address book ──
  const [addressBook,   setAddressBook]   = useState<AddressEntry[]>([])
  const [mode,          setMode]          = useState<'pick' | 'new'>('pick')
  const [search,        setSearch]        = useState('')
  const [dropOpen,      setDropOpen]      = useState(false)
  const [selectedAddr,  setSelectedAddr]  = useState<AddressEntry | null>(null)

  // ── Invoice meta ──
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`)
  const [invoiceDate,   setInvoiceDate]   = useState<Date>(new Date())
  const [calOpen,       setCalOpen]       = useState(false)

  // ── Manual consignee ──
  const [consigneeName,    setConsigneeName]    = useState('')
  const [consigneeCompany, setConsigneeCompany] = useState('')
  const [consigneeAddress, setConsigneeAddress] = useState('')
  const [consigneeCity,    setConsigneeCity]    = useState('')
  const [consigneePhone,   setConsigneePhone]   = useState('')

  // ── Form ──
  const [notes,              setNotes]              = useState('')
  const [totalWeight,        setTotalWeight]        = useState('')
  const [printInvoice,       setPrintInvoice]       = useState(true)
  const [printShippingLabel, setPrintShippingLabel] = useState(false)
  const [items,              setItems]              = useState<LineItem[]>([emptyLine()])
  const [submitting,         setSubmitting]         = useState(false)
  const [error,              setError]              = useState<string | null>(null)

  // ── Fetch address book from shipping_labels ──
  useEffect(() => {
    const sb = createClient()
    sb.from('shipping_labels')
      .select('id, recipient_name, recipient_company, recipient_address, recipient_city, recipient_pincode, recipient_phone')
      .order('created_at', { ascending: false })
      .then(({ data }) => setAddressBook(data ?? []))
  }, [])

  const filteredAddresses = useMemo(() =>
    addressBook.filter(a =>
      !search ||
      a.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.recipient_company ?? '').toLowerCase().includes(search.toLowerCase()) ||
      a.recipient_city.toLowerCase().includes(search.toLowerCase()) ||
      a.recipient_phone.includes(search)
    ), [addressBook, search]
  )

  const handleSelectAddr = (addr: AddressEntry) => {
    setSelectedAddr(addr)
    setDropOpen(false)
    setSearch('')
  }

  // ── Active consignee ──
  const consignee = mode === 'pick' && selectedAddr ? {
    name   : selectedAddr.recipient_name,
    company: selectedAddr.recipient_company ?? '',
    address: selectedAddr.recipient_address,
    city   : `${selectedAddr.recipient_city} - ${selectedAddr.recipient_pincode}`,
    phone  : selectedAddr.recipient_phone,
  } : {
    name   : consigneeName,
    company: consigneeCompany,
    address: consigneeAddress,
    city   : consigneeCity,
    phone  : consigneePhone,
  }

  const updateItem = (idx: number, p: Partial<LineItem>) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...p } : it))
  const removeItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx))

  const totalPkgs  = items.reduce((s, it) => s + (parseInt(it.quantity) || 0), 0)
  const totalValue = items.reduce((s, it) =>
    s + (parseInt(it.quantity) || 0) * (parseFloat(it.unit_value) || 0), 0)

  const handleSubmit = async () => {
    setError(null)
    if (!printInvoice && !printShippingLabel)
      return setError('Select at least one page to print.')
    if (!consignee.name.trim())    return setError('Consignee name is required.')
    if (!consignee.address.trim()) return setError('Consignee address is required.')
    if (!consignee.city.trim())    return setError('Consignee city is required.')
    if (!consignee.phone.trim())   return setError('Consignee phone is required.')
    if (items.some(it => !it.description.trim() || !it.unit_value))
      return setError('Please fill in all line items.')

    setSubmitting(true)
    const sb = createClient()

    const { data: inv, error: invErr } = await sb
      .from('commercial_invoices')
      .insert({
        invoice_number   : invoiceNumber.trim(),
        invoice_date     : format(invoiceDate, 'yyyy-MM-dd'),
        consignee_name   : consignee.name.trim(),
        consignee_company: consignee.company.trim() || null,
        consignee_address: consignee.address.trim(),
        consignee_city   : consignee.city.trim(),
        consignee_phone  : consignee.phone.trim(),
        total_weight     : parseFloat(totalWeight || '0') || 0,
        notes            : notes.trim() || null,
      })
      .select().single()

    if (invErr || !inv) {
      setError('Failed: ' + invErr?.message)
      return setSubmitting(false)
    }

    await sb.from('commercial_invoice_items').insert(
      items.map((it, idx) => ({
        invoice_id     : inv.id,
        description    : it.description.trim(),
        type_of_packing: it.type_of_packing.trim() || 'Box',
        quantity       : parseInt(it.quantity),
        unit_value     : parseFloat(it.unit_value),
        sort_order     : idx,
      }))
    )

    const fullInvoice = {
      ...inv,
      commercial_invoice_items: items.map(it => ({
        description    : it.description,
        type_of_packing: it.type_of_packing,
        quantity       : parseInt(it.quantity),
        unit_value     : parseFloat(it.unit_value),
      })),
    }

    onSaveAndPrint(fullInvoice, { printInvoice, printShippingLabel })
    setSubmitting(false)
    router.refresh()
    onClose()
  }

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-card)' }}>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              New Commercial Invoice
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Invoice · Shipping Label
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Invoice meta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Invoice Number</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                className="h-11 border rounded-lg text-sm" style={inputStyle} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Invoice Date</Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 w-full h-11 px-3 border rounded-lg text-sm"
                    style={inputStyle}>
                    <CalendarIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    {format(invoiceDate, 'dd MMM yyyy')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                  <Calendar mode="single" selected={invoiceDate}
                    onSelect={d => { if (d) { setInvoiceDate(d); setCalOpen(false) } }}
                    initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Shipper */}
          <div className="rounded-xl border p-4"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-dim)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-dim)' }}>Shipper (From)</p>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{sender.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sender.address}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sender.city}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sender.phone}</p>
            {sender.gstin && (
              <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                GSTIN: {sender.gstin}
              </p>
            )}
          </div>

          {/* ── Consignee section ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Consignee (To)
                </p>
              </div>
              {/* Mode toggle */}
              <div className="flex items-center gap-1 p-1 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}>
                <button
                  onClick={() => setMode('pick')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: mode === 'pick' ? 'var(--accent)' : 'transparent',
                    color     : mode === 'pick' ? '#fff' : 'var(--text-secondary)',
                  }}>
                  <UserCheck className="w-3.5 h-3.5" />
                  Address Book
                </button>
                <button
                  onClick={() => { setMode('new'); setSelectedAddr(null) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: mode === 'new' ? 'var(--accent)' : 'transparent',
                    color     : mode === 'new' ? '#fff' : 'var(--text-secondary)',
                  }}>
                  <UserPlus className="w-3.5 h-3.5" />
                  New Customer
                </button>
              </div>
            </div>

            {/* ── Pick from address book ── */}
            {mode === 'pick' && (
              <div className="space-y-3">
                {!selectedAddr ? (
                  <div className="relative">
                    <div
                      className="flex items-center gap-2 h-11 px-3 border rounded-xl cursor-pointer"
                      style={{
                        background : 'var(--bg-input)',
                        borderColor: dropOpen ? 'var(--accent)' : 'var(--border-dim)',
                        color      : 'var(--text-primary)',
                      }}
                      onClick={() => setDropOpen(v => !v)}
                    >
                      <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-dim)' }} />
                      <input
                        placeholder="Search name, company, city or phone…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setDropOpen(true) }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-transparent outline-none text-sm"
                        style={{ color: 'var(--text-primary)' }}
                      />
                      <ChevronDown className="w-4 h-4 shrink-0 transition-transform"
                        style={{
                          color    : 'var(--text-dim)',
                          transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }} />
                    </div>

                    {/* Dropdown */}
                    {dropOpen && (
                      <div
                        className="absolute top-12 left-0 right-0 z-50 rounded-xl border shadow-2xl overflow-hidden"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)', maxHeight: '280px', overflowY: 'auto' }}
                      >
                        {filteredAddresses.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                              {addressBook.length === 0
                                ? 'No saved addresses yet'
                                : 'No matches found'}
                            </p>
                            <button
                              onClick={() => { setMode('new'); setDropOpen(false) }}
                              className="mt-2 text-xs font-semibold"
                              style={{ color: 'var(--accent)' }}>
                              + Add new customer instead
                            </button>
                          </div>
                        ) : filteredAddresses.map(addr => (
                          <button
                            key={addr.id}
                            onClick={() => handleSelectAddr(addr)}
                            className="w-full flex items-start gap-3 px-4 py-3 text-left border-b transition-colors"
                            style={{ borderColor: 'var(--border-dim)' }}
                            onMouseEnter={e =>
                              (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'}
                            onMouseLeave={e =>
                              (e.currentTarget as HTMLElement).style.background = 'transparent'}
                          >
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                              {addr.recipient_name[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate"
                                style={{ color: 'var(--text-primary)' }}>
                                {addr.recipient_name}
                              </p>
                              {addr.recipient_company && (
                                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                  {addr.recipient_company}
                                </p>
                              )}
                              <p className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                                {addr.recipient_address}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                {addr.recipient_city} — {addr.recipient_pincode} · {addr.recipient_phone}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Selected address preview */
                  <div
                    className="rounded-xl border p-4 flex items-start justify-between gap-3"
                    style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                        style={{ background: 'var(--accent)', color: '#fff' }}>
                        {selectedAddr.recipient_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {selectedAddr.recipient_name}
                        </p>
                        {selectedAddr.recipient_company && (
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            {selectedAddr.recipient_company}
                          </p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {selectedAddr.recipient_address}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {selectedAddr.recipient_city} — {selectedAddr.recipient_pincode}
                        </p>
                        <p className="text-xs font-semibold mt-0.5"
                          style={{ color: 'var(--text-primary)' }}>
                          {selectedAddr.recipient_phone}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedAddr(null); setSearch('') }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0"
                      style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)' }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {!selectedAddr && addressBook.length > 0 && (
                  <p className="text-xs text-center" style={{ color: 'var(--text-dim)' }}>
                    Not in the list?{' '}
                    <button onClick={() => setMode('new')}
                      className="font-semibold" style={{ color: 'var(--accent)' }}>
                      Enter new customer →
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* ── Manual entry ── */}
            {mode === 'new' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['Name *',   consigneeName,    setConsigneeName,    'e.g. Aryaman Shinde'],
                  ['Company',  consigneeCompany, setConsigneeCompany, 'e.g. Starvex Technologies'],
                  ['Phone *',  consigneePhone,   setConsigneePhone,   'e.g. 7506054509'],
                  ['City *',   consigneeCity,    setConsigneeCity,    'e.g. Mumbai - 400072'],
                ] as const).map(([label, val, setter, ph]) => (
                  <div key={label} className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-secondary)' }}>{label}</Label>
                    <Input placeholder={ph} value={val}
                      onChange={e => (setter as any)(e.target.value)}
                      className="h-10 border rounded-lg text-sm" style={inputStyle} />
                  </div>
                ))}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>Address *</Label>
                  <Input
                    placeholder="e.g. 201 NG Complex, Near Ashok Nagar, Marol, Andheri East, Maharashtra"
                    value={consigneeAddress} onChange={e => setConsigneeAddress(e.target.value)}
                    className="h-10 border rounded-lg text-sm" style={inputStyle} />
                </div>
                <p className="text-[11px] sm:col-span-2" style={{ color: 'var(--text-dim)' }}>
                  💡 Enter city as "Mumbai - 400072" to auto-fill Code/ZIP on shipping label
                </p>
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Line Items</p>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-dim)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-dim)' }}>
                      {['#', 'Packing', 'Description', 'Qty', 'Unit Value (₹)', 'Total', ''].map((h, i) => (
                        <th key={i}
                          className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest ${i >= 3 && i <= 5 ? 'text-right' : 'text-left'}`}
                          style={{ color: 'var(--text-dim)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <LineItemRow key={idx} item={item} idx={idx}
                        onChange={p => updateItem(idx, p)}
                        onRemove={() => removeItem(idx)}
                        canRemove={items.length > 1} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                      <td colSpan={3} className="px-3 py-3 text-xs font-bold"
                        style={{ color: 'var(--text-secondary)' }}>
                        Total Packages: {totalPkgs}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-bold"
                        style={{ color: 'var(--text-secondary)' }}>{totalPkgs}</td>
                      <td />
                      <td className="px-3 py-3 text-right text-base font-black"
                        style={{ color: 'var(--accent)' }}>
                        ₹{totalValue.toLocaleString()}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <button onClick={() => setItems(p => [...p, emptyLine()])}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium w-full justify-center"
              style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)', background: 'var(--accent-soft)', borderStyle: 'dashed' }}>
              <Plus className="w-3.5 h-3.5" /> Add Line Item
            </button>
          </div>

          {/* Notes + Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Notes — optional</Label>
              <Input placeholder="e.g. For Personal Use Only"
                value={notes} onChange={e => setNotes(e.target.value)}
                className="h-10 border rounded-lg text-sm" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Total Weight — optional</Label>
              <div className="relative">
                <Input type="number" min={0} step="0.01" placeholder="e.g. 0.5"
                  value={totalWeight} onChange={e => setTotalWeight(e.target.value)}
                  className="h-10 border rounded-lg text-sm pr-12" style={inputStyle} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none"
                  style={{ color: 'var(--text-dim)' }}>KG</span>
              </div>
            </div>
          </div>

          {/* Print options */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-dim)' }}>
            <div className="px-4 py-3 border-b"
              style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
              <p className="text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Select pages to print</p>
            </div>
            <div className="p-4 flex flex-col sm:flex-row gap-3">
              {/* Invoice */}
              <button type="button" onClick={() => setPrintInvoice(v => !v)}
                className="flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                style={{
                  background  : printInvoice ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                  borderColor : printInvoice ? 'var(--accent)' : 'var(--border-dim)',
                }}>
                <div className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                  style={{
                    background : printInvoice ? 'var(--accent)' : 'transparent',
                    borderColor: printInvoice ? 'var(--accent)' : 'var(--border-dim)',
                  }}>
                  {printInvoice && (
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4"
                    style={{ color: printInvoice ? 'var(--accent)' : 'var(--text-secondary)' }} />
                  <div>
                    <p className="text-sm font-semibold"
                      style={{ color: printInvoice ? 'var(--accent)' : 'var(--text-primary)' }}>
                      Invoice
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      Commercial invoice with items
                    </p>
                  </div>
                </div>
              </button>

              {/* Shipping label */}
              <button type="button" onClick={() => setPrintShippingLabel(v => !v)}
                className="flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                style={{
                  background  : printShippingLabel ? '#10b98110' : 'var(--bg-secondary)',
                  borderColor : printShippingLabel ? '#10b981' : 'var(--border-dim)',
                }}>
                <div className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                  style={{
                    background : printShippingLabel ? '#10b981' : 'transparent',
                    borderColor: printShippingLabel ? '#10b981' : 'var(--border-dim)',
                  }}>
                  {printShippingLabel && (
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4"
                    style={{ color: printShippingLabel ? '#10b981' : 'var(--text-secondary)' }} />
                  <div>
                    <p className="text-sm font-semibold"
                      style={{ color: printShippingLabel ? '#10b981' : 'var(--text-primary)' }}>
                      Shipping Label
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      Address label for the parcel
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {printInvoice && printShippingLabel && (
              <div className="px-4 pb-3">
                <p className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                  📄 Invoice on page 1 · Shipping label on page 2
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm"
              style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
              ⚠ {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t"
            style={{ borderColor: 'var(--border-dim)' }}>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              <Save className="w-4 h-4" />
              {submitting ? 'Saving…' : 'Save & Print'}
            </button>
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm border"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}