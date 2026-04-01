'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import {
  Plus, Printer, Pencil,
  Trash2, X, Check, FileText,
  Building2, Phone, MapPin,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import type { ShippingLabel } from '@/lib/types'

type Sender = {
  name   : string
  address: string
  city   : string
  phone  : string
  email  : string
}

type FormData = {
  recipient_name    : string
  recipient_company : string
  recipient_address : string
  recipient_city    : string
  recipient_pincode : string
  recipient_phone   : string
  notes             : string
}

const emptyForm = (): FormData => ({
  recipient_name    : '',
  recipient_company : '',
  recipient_address : '',
  recipient_city    : '',
  recipient_pincode : '',
  recipient_phone   : '',
  notes             : '',
})

const PAGE_SIZE = 10

export default function ShippingClient({
  labels = [],
  sender,
}: {
  labels?: ShippingLabel[]
  sender : Sender
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [form,       setForm]       = useState<FormData>(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState(false)
  const [editLabel,  setEditLabel]  = useState<ShippingLabel | null>(null)
  const [editForm,   setEditForm]   = useState<FormData>(emptyForm())
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState(false)
  const [page,       setPage]       = useState(1)

  const totalPages = Math.max(1, Math.ceil(labels.length / PAGE_SIZE))
  const paginated  = labels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const update = (patch: Partial<FormData>) =>
    setForm(p => ({ ...p, ...patch }))

  const validate = (f: FormData) => {
    if (!f.recipient_name.trim())    return 'Recipient name is required.'
    if (!f.recipient_address.trim()) return 'Address is required.'
    if (!f.recipient_city.trim())    return 'City is required.'
    if (!f.recipient_pincode.trim()) return 'Pincode is required.'
    if (!f.recipient_phone.trim())   return 'Phone is required.'
    return null
  }

  const handleSubmit = async () => {
    const err = validate(form)
    if (err) return setError(err)
    setError(null); setSubmitting(true)
    const sb = createClient()
    const { error: dbErr } = await sb.from('shipping_labels').insert({
      recipient_name    : form.recipient_name.trim(),
      recipient_company : form.recipient_company.trim() || null,
      recipient_address : form.recipient_address.trim(),
      recipient_city    : form.recipient_city.trim(),
      recipient_pincode : form.recipient_pincode.trim(),
      recipient_phone   : form.recipient_phone.trim(),
      notes             : form.notes.trim() || 'Electronic Device',
    })
    if (dbErr) { setError('Failed: ' + dbErr.message); return setSubmitting(false) }
    setForm(emptyForm()); setSuccess(true); setSubmitting(false)
    startTransition(() => router.refresh())
    setTimeout(() => setSuccess(false), 3000)
  }

  const openEdit = (label: ShippingLabel) => {
    setEditLabel(label)
    setEditForm({
      recipient_name    : label.recipient_name,
      recipient_company : label.recipient_company ?? '',
      recipient_address : label.recipient_address,
      recipient_city    : label.recipient_city,
      recipient_pincode : label.recipient_pincode,
      recipient_phone   : label.recipient_phone,
      notes             : label.notes ?? 'Electronic Device',
    })
  }

  const handleSave = async () => {
    if (!editLabel) return
    const err = validate(editForm)
    if (err) return setError(err)
    setSaving(true)
    const sb = createClient()
    await sb.from('shipping_labels').update({
      recipient_name    : editForm.recipient_name.trim(),
      recipient_company : editForm.recipient_company.trim() || null,
      recipient_address : editForm.recipient_address.trim(),
      recipient_city    : editForm.recipient_city.trim(),
      recipient_pincode : editForm.recipient_pincode.trim(),
      recipient_phone   : editForm.recipient_phone.trim(),
      notes             : editForm.notes.trim() || null,
      updated_at        : new Date().toISOString(),
    }).eq('id', editLabel.id)
    setSaving(false); setEditLabel(null)
    startTransition(() => router.refresh())
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const sb = createClient()
    await sb.from('shipping_labels').delete().eq('id', id)
    setDeleting(false); setConfirmDel(null)
    startTransition(() => router.refresh())
  }

  const handlePrint = (label: ShippingLabel) => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(generateLabelHTML(label, sender))
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <>
      {/* Edit Modal */}
      {editLabel && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditLabel(null) }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-fade-up mb-8"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Edit Shipping Label
              </p>
              <button onClick={() => setEditLabel(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <FormFields
                form={editForm}
                update={p => setEditForm(prev => ({ ...prev, ...p }))}
                inputStyle={inputStyle}
              />
              <div className="flex gap-3 pt-2 border-t"
                style={{ borderColor: 'var(--border-dim)' }}>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button onClick={() => setEditLabel(null)}
                  className="px-4 py-2.5 rounded-lg text-sm border"
                  style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 md:px-10 py-8 space-y-10">

        {/* Sender preview */}
        <div
          className="rounded-2xl border p-5 flex items-start gap-4"
          style={{
            background  : 'var(--bg-card)',
            borderColor : 'var(--accent-border)',
            boxShadow   : '0 0 0 1px #3b82f615, 0 8px 32px #3b82f610',
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
            <Building2 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: 'var(--text-dim)' }}>From (Sender)</p>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{sender.name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sender.address}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sender.city}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sender.phone} · {sender.email}</p>
          </div>
        </div>

        {/* Create form */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background  : 'var(--bg-card)',
            borderColor : 'var(--accent-border)',
            boxShadow   : '0 0 0 1px #3b82f615, 0 8px 32px #3b82f610',
          }}
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b"
            style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-border)' }}>
              <Plus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                New Shipping Label
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Enter recipient details
              </p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <FormFields form={form} update={update} inputStyle={inputStyle} />
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm"
                style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
                ⚠ {error}
              </div>
            )}
            {success && (
              <div className="px-4 py-3 rounded-lg text-sm"
                style={{ background: '#10b98110', border: '1px solid #10b98128', color: '#10b981' }}>
                ✓ Shipping label created!
              </div>
            )}
            <div className="flex items-center gap-3 pt-2 border-t"
              style={{ borderColor: 'var(--border-dim)' }}>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {submitting ? 'Creating…' : '+ Create Label'}
              </button>
              {Object.values(form).some(v => v) && (
                <button onClick={() => { setForm(emptyForm()); setError(null) }}
                  className="px-4 py-2.5 rounded-lg text-sm border"
                  style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Labels history */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Label History
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              {labels.length}
            </span>
          </div>

          {labels.length === 0 ? (
            <div className="rounded-2xl border py-16 text-center"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No labels yet — create your first one above
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginated.map(label => (
                  <div key={label.id}
                    className="rounded-2xl border overflow-hidden transition-all hover:scale-[1.01]"
                    style={{
                      background  : 'var(--bg-card)',
                      borderColor : 'var(--border-dim)',
                      boxShadow   : '0 4px 16px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div className="h-1"
                      style={{ background: 'linear-gradient(90deg, var(--accent), #8b5cf6)' }} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {label.recipient_name}
                          </p>
                          {label.recipient_company && (
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {label.recipient_company}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--text-dim)' }} />
                          <div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {label.recipient_address}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {label.recipient_city} — {label.recipient_pincode}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-dim)' }} />
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {label.recipient_phone}
                          </p>
                        </div>
                        {label.notes && (
                          <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>
                            {label.notes}
                          </p>
                        )}
                      </div>
                      <p className="text-[10px] mb-3" style={{ color: 'var(--text-dim)' }}>
                        Created {format(new Date(label.created_at), 'dd MMM yyyy, hh:mm a')}
                      </p>
                      <div className="flex items-center gap-2 pt-3 border-t"
                        style={{ borderColor: 'var(--border-dim)' }}>
                        <button
                          onClick={() => handlePrint(label)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all"
                          style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print PDF
                        </button>
                        <button
                          onClick={() => openEdit(label)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                          style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                          onMouseEnter={e => {
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
                          }}
                          onMouseLeave={e => {
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDel === label.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(label.id)}
                              disabled={deleting}
                              className="px-2 py-1 rounded text-xs font-semibold"
                              style={{ background: '#ef4444', color: '#fff' }}>
                              {deleting ? '…' : 'Yes'}
                            </button>
                            <button onClick={() => setConfirmDel(null)}
                              className="px-2 py-1 rounded text-xs border"
                              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDel(label.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                            onMouseEnter={e => {
                              ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
                              ;(e.currentTarget as HTMLElement).style.borderColor = '#ef444430'
                            }}
                            onMouseLeave={e => {
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Page {page} of {totalPages} · {labels.length} labels
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                      style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setPage(p)}
                        className="w-8 h-8 rounded-lg text-sm font-medium border"
                        style={{
                          background  : page === p ? 'var(--accent)' : 'transparent',
                          borderColor : page === p ? 'var(--accent)' : 'var(--border-dim)',
                          color       : page === p ? '#fff' : 'var(--text-secondary)',
                        }}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                      style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
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

// ── Form Fields ────────────────────────────────────────────────────────────
function FormFields({
  form,
  update,
  inputStyle,
}: {
  form      : FormData
  update    : (patch: Partial<FormData>) => void
  inputStyle: React.CSSProperties
}) {
  const field = (
    label      : string,
    key        : keyof FormData,
    placeholder: string,
    required   = true,
    colSpan    = ''
  ) => (
    <div className={`space-y-1.5 ${colSpan}`}>
      <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1"
        style={{ color: 'var(--text-secondary)' }}>
        {label}
        {required && <span style={{ color: '#ef4444' }}>*</span>}
      </Label>
      <Input
        placeholder={placeholder}
        value={form[key]}
        onChange={e => update({ [key]: e.target.value })}
        className="h-11 border rounded-lg text-sm"
        style={inputStyle}
      />
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {field('Recipient Name',     'recipient_name',    'e.g. Rahul Sharma')}
      {field('Company (optional)', 'recipient_company', 'e.g. XYZ Tech Pvt. Ltd.', false)}
      {field('Address',            'recipient_address', 'Street / Building / Area', true, 'sm:col-span-2')}
      {field('City',               'recipient_city',    'e.g. Bengaluru')}
      {field('Pincode',            'recipient_pincode', 'e.g. 560001')}
      {field('Phone',              'recipient_phone',   'e.g. +91 98765 43210')}
      {field('Notes (optional)',   'notes',             'e.g. Handle with care', false)}
    </div>
  )
}

// ── PDF Generator ──────────────────────────────────────────────────────────
function generateLabelHTML(label: ShippingLabel, sender: Sender): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Shipping Label</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family    : 'Arial', sans-serif;
      background     : #fff;
      display        : flex;
      align-items    : center;
      justify-content: center;
      min-height     : 100vh;
    }

    @page {
      size   : A4 portrait;
      margin : 0;
    }

    .sheet {
      width          : 210mm;
      min-height     : 297mm;
      display        : flex;
      align-items    : center;
      justify-content: center;
      padding        : 18mm;
      background     : #fff;
    }

    .label {
      width  : 100%;
      border : 2px solid #000;
    }

    /* ── Top bar ── */
    .top-bar {
      display        : flex;
      align-items    : flex-start;
      justify-content: space-between;
      padding        : 12px 16px;
      border-bottom  : 2px solid #000;
      gap            : 20px;
    }

    .company-name {
      font-size  : 15px;
      font-weight: 900;
      color      : #000;
    }

    .company-address {
      font-size  : 9px;
      color      : #222;
      line-height: 1.6;
      text-align : right;
      max-width  : 260px;
    }

    /* ── Shipping header ── */
    .shipping-header {
      display        : flex;
      align-items    : center;
      justify-content: space-between;
      padding        : 14px 16px;
      background     : #000;
      border-bottom  : 2px solid #000;
    }

    .shipping-title {
      font-size     : 22px;
      font-weight   : 900;
      color         : #fff;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    /* ── Fields ── */
    .field-row {
      display      : flex;
      border-bottom: 2px solid #000;
    }

    .field-row:last-child {
      border-bottom: none;
    }

    .field {
      flex           : 1;
      border-right   : 2px solid #000;
      min-height     : 70px;
      display        : flex;
      flex-direction : column;
      justify-content: space-between;
      padding        : 8px 12px 10px;
    }

    .field:last-child {
      border-right: none;
    }

    .field-label {
      font-size     : 8px;
      font-weight   : 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color         : #555;
    }

    .field-value {
      font-size  : 18px;
      font-weight: 900;
      color      : #000;
      line-height: 1.2;
      margin-top : 6px;
    }

    .field-value.medium {
      font-size: 14px;
    }

    .field-value.small {
      font-size  : 12px;
      font-weight: 600;
    }

    .field.tall {
      min-height: 90px;
    }

    @media print {
      body   { min-height: unset; }
      .sheet { min-height: unset; }
      * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="label">

      <!-- Top bar -->
      <div class="top-bar">
        <div class="company-name">${sender.name}</div>
        <div class="company-address">
          ${sender.phone}<br/>
          ${sender.address}<br/>
          ${sender.city}<br/>
          ${sender.email}
        </div>
      </div>

      <!-- Shipping header -->
      <div class="shipping-header">
        <div class="shipping-title">Shipping Information</div>
      </div>

      <!-- Row 1: Name | Phone -->
      <div class="field-row">
        <div class="field">
          <div class="field-label">Name</div>
          <div class="field-value">${label.recipient_name}</div>
        </div>
        <div class="field">
          <div class="field-label">Phone Number</div>
          <div class="field-value">${label.recipient_phone}</div>
        </div>
      </div>

      ${label.recipient_company ? `
      <!-- Row: Company -->
      <div class="field-row">
        <div class="field" style="border-right:none;">
          <div class="field-label">Company</div>
          <div class="field-value medium">${label.recipient_company}</div>
        </div>
      </div>
      ` : ''}

      <!-- Row 2: Address -->
      <div class="field-row">
        <div class="field tall" style="border-right:none;">
          <div class="field-label">Address</div>
          <div class="field-value">${label.recipient_address}</div>
        </div>
      </div>

      <!-- Row 3: City | Code/ZIP | Content -->
      <div class="field-row">
        <div class="field">
          <div class="field-label">City</div>
          <div class="field-value">${label.recipient_city}</div>
        </div>
        <div class="field">
          <div class="field-label">Code / ZIP</div>
          <div class="field-value">${label.recipient_pincode}</div>
        </div>
        <div class="field">
          <div class="field-label">Content</div>
          <div class="field-value">${label.notes ?? '—'}</div>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`
}

function generateBarLines(): string {
  return ''
}