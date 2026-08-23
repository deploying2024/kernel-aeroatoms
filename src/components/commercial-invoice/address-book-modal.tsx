'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  X, Save, Pencil, Search, BookUser,
  UserPlus, Check, Trash2, ChevronLeft,
} from 'lucide-react'

export type AddressEntry = {
  id               : string
  recipient_name   : string
  recipient_company: string | null
  recipient_address: string
  recipient_city   : string
  recipient_pincode: string
  recipient_phone  : string
}

type EmptyForm = {
  name    : string
  company : string
  address : string
  city    : string
  pincode : string
  phone   : string
}

const emptyForm = (): EmptyForm => ({
  name    : '',
  company : '',
  address : '',
  city    : '',
  pincode : '',
  phone   : '',
})

function validate(f: EmptyForm) {
  if (!f.name.trim())    return 'Name is required.'
  if (!f.address.trim()) return 'Address is required.'
  if (!f.city.trim())    return 'City is required.'
  if (!f.pincode.trim()) return 'Pincode is required.'
  if (!f.phone.trim())   return 'Phone is required.'
  return null
}

// ── Shared field grid ─────────────────────────────────────────────────────────
function FormFields({
  form,
  onChange,
  inputStyle,
}: {
  form      : EmptyForm
  onChange  : (patch: Partial<EmptyForm>) => void
  inputStyle: React.CSSProperties
}) {
  const field = (
    label      : string,
    key        : keyof EmptyForm,
    placeholder: string,
    required   = true,
    colSpan    = '',
  ) => (
    <div className={`space-y-1.5 ${colSpan}`}>
      <Label
        className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
        {required && <span style={{ color: '#ef4444' }}>*</span>}
      </Label>
      <Input
        placeholder={placeholder}
        value={form[key]}
        onChange={e => onChange({ [key]: e.target.value })}
        className="h-9 border rounded-lg text-sm"
        style={inputStyle}
      />
    </div>
  )

  return (
    <div className="grid grid-cols-2 gap-2">
      {field('Name',             'name',    'e.g. Rahul Sharma'       )}
      {field('Company',          'company', 'e.g. XYZ Pvt. Ltd.',false)}
      {field('Phone',            'phone',   '+91 98765 43210'         )}
      {field('City',             'city',    'e.g. Mumbai'             )}
      {field('Pincode',          'pincode', 'e.g. 400072'             )}
      {field('Address', 'address', 'Street / Building / Area', true, 'col-span-2')}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function AddressBookModal({
  onClose,
  initialView = 'list',
}: {
  onClose     : () => void
  initialView?: 'list' | 'add'
}) {
  const [view,      setView]      = useState<'list' | 'add' | 'edit'>(initialView)
  const [addresses, setAddresses] = useState<AddressEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  // ── Add form state ──
  const [addForm,    setAddForm]    = useState<EmptyForm>(emptyForm())
  const [addError,   setAddError]   = useState<string | null>(null)
  const [addSaving,  setAddSaving]  = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)

  // ── Edit state ──
  const [editId,    setEditId]    = useState<string | null>(null)
  const [editForm,  setEditForm]  = useState<EmptyForm>(emptyForm())
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // ── Delete state ──
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  // ── Fetch ──
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

  // ── Add ──
  const handleAdd = async () => {
    const err = validate(addForm)
    if (err) return setAddError(err)
    setAddError(null)
    setAddSaving(true)

    const { data, error } = await createClient()
      .from('shipping_labels')
      .insert({
        recipient_name    : addForm.name.trim(),
        recipient_company : addForm.company.trim() || null,
        recipient_address : addForm.address.trim(),
        recipient_city    : addForm.city.trim(),
        recipient_pincode : addForm.pincode.trim(),
        recipient_phone   : addForm.phone.trim(),
      })
      .select().single()

    setAddSaving(false)

    if (error) return setAddError('Failed: ' + error.message)

    if (data) setAddresses(prev => [data, ...prev])
    setAddForm(emptyForm())
    setAddSuccess(true)
    setTimeout(() => { setAddSuccess(false); setView('list') }, 1500)
  }

  // ── Open edit ──
  const openEdit = (a: AddressEntry) => {
    setEditId(a.id)
    setEditForm({
      name    : a.recipient_name,
      company : a.recipient_company ?? '',
      address : a.recipient_address,
      city    : a.recipient_city,
      pincode : a.recipient_pincode,
      phone   : a.recipient_phone,
    })
    setEditError(null)
    setView('edit')
  }

  // ── Save edit ──
  const handleSaveEdit = async () => {
    if (!editId) return
    const err = validate(editForm)
    if (err) return setEditError(err)
    setEditError(null)
    setEditSaving(true)

    await createClient()
      .from('shipping_labels')
      .update({
        recipient_name    : editForm.name.trim(),
        recipient_company : editForm.company.trim() || null,
        recipient_address : editForm.address.trim(),
        recipient_city    : editForm.city.trim(),
        recipient_pincode : editForm.pincode.trim(),
        recipient_phone   : editForm.phone.trim(),
        updated_at        : new Date().toISOString(),
      })
      .eq('id', editId)

    setAddresses(prev => prev.map(a => a.id === editId ? {
      ...a,
      recipient_name    : editForm.name.trim(),
      recipient_company : editForm.company.trim() || null,
      recipient_address : editForm.address.trim(),
      recipient_city    : editForm.city.trim(),
      recipient_pincode : editForm.pincode.trim(),
      recipient_phone   : editForm.phone.trim(),
    } : a))

    setEditSaving(false)
    setView('list')
  }

  // ── Delete ──
  const handleDelete = async (id: string) => {
    setDeleting(true)
    await createClient().from('shipping_labels').delete().eq('id', id)
    setAddresses(prev => prev.filter(a => a.id !== id))
    setDeleting(false)
    setConfirmDel(null)
  }

  // ── Header label per view ──
  const headerTitle = view === 'add'
    ? 'Add New Customer'
    : view === 'edit'
    ? 'Edit Customer'
    : 'Address Book'

  const headerSub = view === 'list'
    ? `${addresses.length} saved addresses`
    : view === 'add'
    ? 'Fill in the details below'
    : 'Update customer details'

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

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-card)' }}
        >
          <div className="flex items-center gap-3">
            {/* Back button for add/edit views */}
            {view !== 'list' && (
              <button
                onClick={() => { setView('list'); setAddError(null); setEditError(null) }}
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
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {headerTitle}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {headerSub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Add button — only show on list view */}
            {view === 'list' && (
              <button
                onClick={() => { setView('add'); setAddForm(emptyForm()); setAddError(null) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Customer
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* ── VIEW: LIST ── */}
        {/* ══════════════════════════════════════════════ */}
        {view === 'list' && (
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
                autoFocus
              />
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto"
                  style={{ borderColor: 'var(--border-dim)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <BookUser className="w-10 h-10 mx-auto mb-3 opacity-20"
                  style={{ color: 'var(--text-primary)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {addresses.length === 0 ? 'No saved addresses yet' : 'No matches found'}
                </p>
                {addresses.length === 0 && (
                  <button
                    onClick={() => setView('add')}
                    className="mt-3 text-sm font-semibold"
                    style={{ color: 'var(--accent)' }}
                  >
                    + Add your first customer
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(addr => (
                  <div
                    key={addr.id}
                    className="flex items-start justify-between gap-3 p-4 rounded-xl border transition-all"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-dim)' }}
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
                        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {addr.recipient_phone}
                        </p>
                      </div>
                    </div>

                    {/* Edit + Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(addr)}
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

                      {confirmDel === addr.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(addr.id)}
                            disabled={deleting}
                            className="px-2 py-1 rounded text-xs font-semibold disabled:opacity-50"
                            style={{ background: '#ef4444', color: '#fff' }}
                          >
                            {deleting ? '…' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmDel(null)}
                            className="px-2 py-1 rounded text-xs border"
                            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDel(addr.id)}
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
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* ── VIEW: ADD ── */}
        {/* ══════════════════════════════════════════════ */}
        {view === 'add' && (
          <div className="p-6 space-y-5">

            {/* Success banner */}
            {addSuccess && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: '#10b98115', border: '1px solid #10b98130' }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: '#10b981' }}>
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#10b981' }}>
                  Customer added! Returning to list…
                </p>
              </div>
            )}

            <FormFields
              form={addForm}
              onChange={patch => setAddForm(p => ({ ...p, ...patch }))}
              inputStyle={inputStyle}
            />

            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              💡 Enter city as "Mumbai - 400072" to auto-fill Code/ZIP on shipping labels.
            </p>

            {addError && (
              <div className="px-4 py-3 rounded-lg text-sm"
                style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
                ⚠ {addError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t"
              style={{ borderColor: 'var(--border-dim)' }}>
              <button
                onClick={handleAdd}
                disabled={addSaving || addSuccess}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <Save className="w-4 h-4" />
                {addSaving ? 'Saving…' : 'Save Customer'}
              </button>
              <button
                onClick={() => { setAddForm(emptyForm()); setAddError(null) }}
                className="px-4 py-2.5 rounded-lg text-sm border"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* ── VIEW: EDIT ── */}
        {/* ══════════════════════════════════════════════ */}
        {view === 'edit' && (
          <div className="p-6 space-y-5">

            <FormFields
              form={editForm}
              onChange={patch => setEditForm(p => ({ ...p, ...patch }))}
              inputStyle={inputStyle}
            />

            {editError && (
              <div className="px-4 py-3 rounded-lg text-sm"
                style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
                ⚠ {editError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t"
              style={{ borderColor: 'var(--border-dim)' }}>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <Save className="w-4 h-4" />
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => { setView('list'); setEditError(null) }}
                className="px-4 py-2.5 rounded-lg text-sm border"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}