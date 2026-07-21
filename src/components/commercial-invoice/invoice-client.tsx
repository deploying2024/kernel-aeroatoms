'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import {
  Plus, Printer, Trash2, Pencil,
  FileText, Building2, Phone,
  MapPin, ChevronLeft, ChevronRight,
  Weight, X, Save, CalendarIcon,
  Search, BookUser,
} from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import InvoiceForm from './invoice-form'
import { generateInvoiceHTML, type PrintOptions } from './invoice-pdf'

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n)

type Sender = {
  name   : string
  address: string
  city   : string
  phone  : string
  email  : string
  gstin? : string
}

type InvoiceItem = {
  id             : string
  description    : string
  type_of_packing: string
  quantity       : number
  unit_value     : number
  sort_order     : number
}

type Invoice = {
  id               : string
  invoice_number   : string
  invoice_date     : string
  consignee_name   : string
  consignee_company: string | null
  consignee_address: string
  consignee_city   : string
  consignee_phone  : string
  total_weight     : number
  notes            : string | null
  created_at       : string
  commercial_invoice_items: InvoiceItem[]
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

const PAGE_SIZE = 10

// ── Address Book Modal ───────────────────────────────────────────────────────
function AddressBookModal({ onClose }: { onClose: () => void }) {
  const [addresses, setAddresses] = useState<AddressEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [saving,    setSaving]    = useState(false)

  const [eName,    setEName]    = useState('')
  const [eCompany, setECompany] = useState('')
  const [eAddress, setEAddress] = useState('')
  const [eCity,    setECity]    = useState('')
  const [ePincode, setEPincode] = useState('')
  const [ePhone,   setEPhone]   = useState('')

  useEffect(() => {
    createClient()
      .from('shipping_labels')
      .select('id, recipient_name, recipient_company, recipient_address, recipient_city, recipient_pincode, recipient_phone')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAddresses(data ?? []); setLoading(false) })
  }, [])

  const filtered = addresses.filter(a =>
    !search ||
    a.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
    (a.recipient_company ?? '').toLowerCase().includes(search.toLowerCase()) ||
    a.recipient_city.toLowerCase().includes(search.toLowerCase()) ||
    a.recipient_phone.includes(search)
  )

  const openEdit = (a: AddressEntry) => {
    setEditId(a.id)
    setEName(a.recipient_name)
    setECompany(a.recipient_company ?? '')
    setEAddress(a.recipient_address)
    setECity(a.recipient_city)
    setEPincode(a.recipient_pincode)
    setEPhone(a.recipient_phone)
  }

  const handleSave = async () => {
    if (!editId) return
    setSaving(true)
    await createClient()
      .from('shipping_labels')
      .update({
        recipient_name    : eName.trim(),
        recipient_company : eCompany.trim() || null,
        recipient_address : eAddress.trim(),
        recipient_city    : eCity.trim(),
        recipient_pincode : ePincode.trim(),
        recipient_phone   : ePhone.trim(),
      })
      .eq('id', editId)

    setAddresses(prev => prev.map(a => a.id === editId ? {
      ...a,
      recipient_name    : eName.trim(),
      recipient_company : eCompany.trim() || null,
      recipient_address : eAddress.trim(),
      recipient_city    : eCity.trim(),
      recipient_pincode : ePincode.trim(),
      recipient_phone   : ePhone.trim(),
    } : a))

    setSaving(false)
    setEditId(null)
  }

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-card)' }}
        >
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Address Book
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {addresses.length} saved addresses — click ✎ to edit
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--text-dim)' }}
            />
            <Input
              placeholder="Search name, company, city or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 border rounded-lg text-sm"
              style={inputStyle}
            />
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div
                className="w-6 h-6 border-2 rounded-full animate-spin mx-auto"
                style={{ borderColor: 'var(--border-dim)', borderTopColor: 'var(--accent)' }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <BookUser
                className="w-10 h-10 mx-auto mb-3 opacity-20"
                style={{ color: 'var(--text-primary)' }}
              />
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                {addresses.length === 0 ? 'No saved addresses yet' : 'No matches found'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(addr => (
                <div key={addr.id}>
                  {editId === addr.id ? (
                    /* ── Inline edit form ── */
                    <div
                      className="rounded-xl border p-4 space-y-3"
                      style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-border)' }}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: 'var(--accent)' }}>
                        Editing — {addr.recipient_name}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ['Name *',    eName,    setEName,    'e.g. Rahul Sharma'    ],
                          ['Company',   eCompany, setECompany, 'e.g. XYZ Pvt. Ltd.'  ],
                          ['Phone *',   ePhone,   setEPhone,   '+91 98765 43210'      ],
                          ['City *',    eCity,    setECity,    'e.g. Mumbai'          ],
                          ['Pincode *', ePincode, setEPincode, 'e.g. 400072'         ],
                        ] as const).map(([label, val, setter, ph]) => (
                          <div key={label} className="space-y-1">
                            <Label
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {label}
                            </Label>
                            <Input
                              placeholder={ph} value={val}
                              onChange={e => (setter as any)(e.target.value)}
                              className="h-9 border rounded-lg text-sm"
                              style={inputStyle}
                            />
                          </div>
                        ))}
                        <div className="col-span-2 space-y-1">
                          <Label
                            className="text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Address *
                          </Label>
                          <Input
                            placeholder="Street / Building / Area"
                            value={eAddress}
                            onChange={e => setEAddress(e.target.value)}
                            className="h-9 border rounded-lg text-sm"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                          style={{ background: 'var(--accent)', color: '#fff' }}
                        >
                          <Save className="w-3.5 h-3.5" />
                          {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="px-4 py-2 rounded-lg text-sm border"
                          style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Address card ── */
                    <div
                      className="flex items-start justify-between gap-3 p-4 rounded-xl border transition-all"
                      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-dim)' }}
                      onMouseEnter={e =>
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'}
                      onMouseLeave={e =>
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                          {addr.recipient_name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {addr.recipient_name}
                          </p>
                          {addr.recipient_company && (
                            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                              {addr.recipient_company}
                            </p>
                          )}
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>
                            {addr.recipient_address}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                            {addr.recipient_city} — {addr.recipient_pincode}
                          </p>
                          <p className="text-xs font-semibold mt-0.5"
                            style={{ color: 'var(--text-secondary)' }}>
                            {addr.recipient_phone}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => openEdit(addr)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition-all"
                        style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Edit Invoice Modal ───────────────────────────────────────────────────────
function EditModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice
  onClose: () => void
  onSaved: () => void
}) {
  const [name,    setName]    = useState(invoice.consignee_name)
  const [company, setCompany] = useState(invoice.consignee_company ?? '')
  const [address, setAddress] = useState(invoice.consignee_address)
  const [city,    setCity]    = useState(invoice.consignee_city)
  const [phone,   setPhone]   = useState(invoice.consignee_phone)
  const [weight,  setWeight]  = useState(invoice.total_weight > 0 ? String(invoice.total_weight) : '')
  const [notes,   setNotes]   = useState(invoice.notes ?? '')
  const [date,    setDate]    = useState<Date>(parseISO(invoice.invoice_date))
  const [calOpen, setCalOpen] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    if (!name.trim())    return setError('Name is required.')
    if (!address.trim()) return setError('Address is required.')
    if (!city.trim())    return setError('City is required.')
    if (!phone.trim())   return setError('Phone is required.')

    setSaving(true)
    await createClient()
      .from('commercial_invoices')
      .update({
        consignee_name   : name.trim(),
        consignee_company: company.trim() || null,
        consignee_address: address.trim(),
        consignee_city   : city.trim(),
        consignee_phone  : phone.trim(),
        total_weight     : parseFloat(weight || '0') || 0,
        notes            : notes.trim() || null,
        invoice_date     : format(date, 'yyyy-MM-dd'),
      })
      .eq('id', invoice.id)

    setSaving(false)
    onSaved()
    onClose()
  }

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-card)' }}
        >
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Edit Invoice
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {invoice.invoice_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Date */}
          <div className="space-y-1.5">
            <Label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              Invoice Date
            </Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-2 w-full h-10 px-3 border rounded-lg text-sm"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-dim)', color: 'var(--text-primary)' }}
                >
                  <CalendarIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  {format(date, 'dd MMM yyyy')}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
              >
                <Calendar
                  mode="single" selected={date}
                  onSelect={d => { if (d) { setDate(d); setCalOpen(false) } }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Consignee fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              ['Name *',   name,    setName,    'Consignee name'   ],
              ['Company',  company, setCompany, 'Company name'     ],
              ['Phone *',  phone,   setPhone,   '+91 XXXXX XXXXX'  ],
              ['City *',   city,    setCity,    'City - Pincode'   ],
            ] as const).map(([label, val, setter, ph]) => (
              <div key={label} className="space-y-1.5">
                <Label
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {label}
                </Label>
                <Input
                  placeholder={ph} value={val}
                  onChange={e => (setter as any)(e.target.value)}
                  className="h-10 border rounded-lg text-sm"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-dim)', color: 'var(--text-primary)' }}
                />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Address *
              </Label>
              <Input
                placeholder="Street / Building / Area"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="h-10 border rounded-lg text-sm"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-dim)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Notes + Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Notes
              </Label>
              <Input
                placeholder="e.g. For Personal Use"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="h-10 border rounded-lg text-sm"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-dim)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Weight (KG)
              </Label>
              <div className="relative">
                <Input
                  type="number" min={0} step="0.01" placeholder="0.0"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="h-10 border rounded-lg text-sm pr-10"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-dim)', color: 'var(--text-primary)' }}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                  style={{ color: 'var(--text-dim)' }}
                >
                  KG
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}
            >
              ⚠ {error}
            </div>
          )}

          <div
            className="flex items-center gap-3 pt-2 border-t"
            style={{ borderColor: 'var(--border-dim)' }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm border"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Print Dialog ─────────────────────────────────────────────────────────────
function PrintDialog({
  invoice,
  sender,
  logoUrl,
  onClose,
}: {
  invoice: Invoice
  sender : Sender
  logoUrl: string
  onClose: () => void
}) {
  const [printInvoice,       setPrintInvoice]       = useState(true)
  const [printShippingLabel, setPrintShippingLabel] = useState(false)

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(
      generateInvoiceHTML(invoice, sender, logoUrl, { printInvoice, printShippingLabel })
    )
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 600)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}
        >
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              Select pages to print
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {invoice.invoice_number} · {invoice.consignee_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center border"
            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 space-y-3">

          {/* Invoice toggle */}
          <button
            type="button"
            onClick={() => setPrintInvoice(v => !v)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
            style={{
              background  : printInvoice ? 'var(--accent-soft)' : 'var(--bg-secondary)',
              borderColor : printInvoice ? 'var(--accent)' : 'var(--border-dim)',
            }}
          >
            <div
              className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
              style={{
                background : printInvoice ? 'var(--accent)' : 'transparent',
                borderColor: printInvoice ? 'var(--accent)' : 'var(--border-dim)',
              }}
            >
              {printInvoice && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FileText
                className="w-4 h-4"
                style={{ color: printInvoice ? 'var(--accent)' : 'var(--text-secondary)' }}
              />
              <div>
                <p className="text-sm font-semibold"
                  style={{ color: printInvoice ? 'var(--accent)' : 'var(--text-primary)' }}>
                  Invoice
                </p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  Commercial invoice with line items
                </p>
              </div>
            </div>
          </button>

          {/* Shipping label toggle */}
          <button
            type="button"
            onClick={() => setPrintShippingLabel(v => !v)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
            style={{
              background  : printShippingLabel ? '#10b98110' : 'var(--bg-secondary)',
              borderColor : printShippingLabel ? '#10b981'   : 'var(--border-dim)',
            }}
          >
            <div
              className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
              style={{
                background : printShippingLabel ? '#10b981' : 'transparent',
                borderColor: printShippingLabel ? '#10b981' : 'var(--border-dim)',
              }}
            >
              {printShippingLabel && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Printer
                className="w-4 h-4"
                style={{ color: printShippingLabel ? '#10b981' : 'var(--text-secondary)' }}
              />
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

          {printInvoice && printShippingLabel && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
            >
              📄 Invoice on page 1 · Shipping label on page 2
            </p>
          )}

          <button
            onClick={handlePrint}
            disabled={!printInvoice && !printShippingLabel}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Printer className="w-4 h-4" />
            Print Selected
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Client ──────────────────────────────────────────────────────────────
export default function CommercialInvoiceClient({
  invoices = [],
  sender,
  logoUrl = '/logo.png',
}: {
  invoices?: Invoice[]
  sender   : Sender
  logoUrl? : string
}) {
  const router = useRouter()

  const [showForm,      setShowForm]      = useState(false)
  const [showAddrBook,  setShowAddrBook]  = useState(false)
  const [editInvoice,   setEditInvoice]   = useState<Invoice | null>(null)
  const [printInvoice,  setPrintInvoice]  = useState<Invoice | null>(null)
  const [confirmDel,    setConfirmDel]    = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState(false)
  const [page,          setPage]          = useState(1)

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE))
  const paginated  = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSaveAndPrint = (invoice: any, opts: PrintOptions) => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(generateInvoiceHTML(invoice, sender, logoUrl, opts))
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 600)
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const sb = createClient()
    await sb.from('commercial_invoice_items').delete().eq('invoice_id', id)
    await sb.from('commercial_invoices').delete().eq('id', id)
    setDeleting(false)
    setConfirmDel(null)
    router.refresh()
  }

  return (
    <>
      {/* Modals */}
      {showForm && (
        <InvoiceForm
          sender={sender}
          logoUrl={logoUrl}
          onClose={() => setShowForm(false)}
          onSaveAndPrint={handleSaveAndPrint}
        />
      )}

      {showAddrBook && (
        <AddressBookModal onClose={() => setShowAddrBook(false)} />
      )}

      {editInvoice && (
        <EditModal
          invoice={editInvoice}
          onClose={() => setEditInvoice(null)}
          onSaved={() => router.refresh()}
        />
      )}

      {printInvoice && (
        <PrintDialog
          invoice={printInvoice}
          sender={sender}
          logoUrl={logoUrl}
          onClose={() => setPrintInvoice(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDel(null) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: '#ef444430' }}
          >
            <div
              className="px-6 py-5 border-b"
              style={{ background: '#ef444408', borderColor: 'var(--border-dim)' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: '#ef444415', border: '1px solid #ef444430' }}
                >
                  <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                </div>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  Delete Invoice?
                </p>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                This invoice and all its items will be permanently deleted.
              </p>
              <p className="text-xs mt-2" style={{ color: '#ef4444' }}>⚠ Cannot be undone.</p>
            </div>
            <div className="flex gap-3 px-6 py-4">
              <button
                onClick={() => handleDelete(confirmDel)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                {deleting
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
                  : <><Trash2 className="w-4 h-4" /> Yes, Delete</>}
              </button>
              <button
                onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="px-6 md:px-10 py-8 space-y-8">

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Plus className="w-4 h-4" /> New Invoice
          </button>
          <button
            onClick={() => setShowAddrBook(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
            style={{
              borderColor: 'var(--border-dim)',
              color      : 'var(--text-secondary)',
              background : 'var(--bg-card)',
            }}
          >
            <BookUser className="w-4 h-4" /> Address Book
          </button>
        </div>

        {/* Sender card */}
        <div
          className="rounded-2xl border p-5 flex items-start gap-4"
          style={{
            background  : 'var(--bg-card)',
            borderColor : 'var(--accent-border)',
            boxShadow   : '0 0 0 1px #3b82f615, 0 8px 32px #3b82f610',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
          >
            <Building2 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: 'var(--text-dim)' }}>
              Shipper (Your Company)
            </p>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              {sender.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sender.address}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sender.city}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {sender.phone} · {sender.email}
            </p>
            {sender.gstin && (
              <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                GSTIN: {sender.gstin}
              </p>
            )}
          </div>
        </div>

        {/* Invoice history */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Invoice History
            </h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background : 'var(--accent-soft)',
                color      : 'var(--accent)',
                border     : '1px solid var(--accent-border)',
              }}
            >
              {invoices.length}
            </span>
          </div>

          {invoices.length === 0 ? (
            <div
              className="rounded-2xl border py-16 text-center"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
            >
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20"
                style={{ color: 'var(--text-primary)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No invoices yet — create your first one above
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginated.map(invoice => {
                  const total = invoice.commercial_invoice_items
                    .reduce((s, it) => s + it.quantity * it.unit_value, 0)

                  return (
                    <div
                      key={invoice.id}
                      className="rounded-2xl border overflow-hidden transition-all hover:scale-[1.01]"
                      style={{
                        background  : 'var(--bg-card)',
                        borderColor : 'var(--border-dim)',
                        boxShadow   : '0 4px 16px rgba(0,0,0,0.08)',
                      }}
                    >
                      {/* Accent bar */}
                      <div
                        className="h-1"
                        style={{ background: 'linear-gradient(90deg, var(--accent), #8b5cf6)' }}
                      />

                      <div className="p-4 space-y-3">
                        {/* Invoice number + date */}
                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs font-bold px-2 py-1 rounded-lg"
                            style={{
                              background: 'var(--accent-soft)',
                              color     : 'var(--accent)',
                              border    : '1px solid var(--accent-border)',
                            }}
                          >
                            {invoice.invoice_number}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                          </span>
                        </div>

                        {/* Consignee */}
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {invoice.consignee_name}
                          </p>
                          {invoice.consignee_company && (
                            <p className="text-xs font-semibold"
                              style={{ color: 'var(--text-secondary)' }}>
                              {invoice.consignee_company}
                            </p>
                          )}
                        </div>

                        {/* Address + phone */}
                        <div className="space-y-1">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0"
                              style={{ color: 'var(--text-dim)' }} />
                            <div>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {invoice.consignee_address}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {invoice.consignee_city}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 shrink-0"
                              style={{ color: 'var(--text-dim)' }} />
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {invoice.consignee_phone}
                            </p>
                          </div>
                        </div>

                        {/* Items summary */}
                        <div
                          className="rounded-lg p-2.5 space-y-1.5"
                          style={{ background: 'var(--bg-secondary)' }}
                        >
                          {invoice.commercial_invoice_items.slice(0, 2).map(it => (
                            <div key={it.id} className="flex items-center justify-between">
                              <span
                                className="text-xs truncate max-w-40"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {it.description}
                              </span>
                              <span className="text-xs font-semibold"
                                style={{ color: 'var(--accent)' }}>
                                    {fmtINR(it.quantity * it.unit_value)}
                              </span>
                            </div>
                          ))}
                          {invoice.commercial_invoice_items.length > 2 && (
                            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                              +{invoice.commercial_invoice_items.length - 2} more items
                            </p>
                          )}
                          <div
                            className="flex items-center justify-between pt-1.5 border-t"
                            style={{ borderColor: 'var(--border-dim)' }}
                          >
                            <span className="text-xs font-bold"
                              style={{ color: 'var(--text-secondary)' }}>
                              Total Value
                            </span>
                            <span className="text-sm font-black"
                              style={{ color: 'var(--accent)' }}>
{fmtINR(total)}                            
</span>
                          </div>
                          {invoice.total_weight > 0 && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <Weight className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
                              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {invoice.total_weight} KG
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div
                          className="flex items-center gap-2 pt-1 border-t"
                          style={{ borderColor: 'var(--border-dim)' }}
                        >
                          <button
                            onClick={() => setPrintInvoice(invoice)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border"
                            style={{
                              background  : 'var(--accent-soft)',
                              borderColor : 'var(--accent-border)',
                              color       : 'var(--accent)',
                            }}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print
                          </button>

                          <button
                            onClick={() => setEditInvoice(invoice)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                            onMouseEnter={e => {
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
                              ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'
                            }}
                            onMouseLeave={e => {
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setConfirmDel(invoice.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                            onMouseEnter={e => {
                              ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
                              ;(e.currentTarget as HTMLElement).style.borderColor = '#ef444430'
                              ;(e.currentTarget as HTMLElement).style.background = '#ef444410'
                            }}
                            onMouseLeave={e => {
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Page {page} of {totalPages} · {invoices.length} invoices
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                      style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className="w-8 h-8 rounded-lg text-sm font-medium border"
                        style={{
                          background  : page === p ? 'var(--accent)' : 'transparent',
                          borderColor : page === p ? 'var(--accent)' : 'var(--border-dim)',
                          color       : page === p ? '#fff' : 'var(--text-secondary)',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                      style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}