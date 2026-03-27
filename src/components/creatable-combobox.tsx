'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Option = { id: string; label: string }

type Props = {
  options      : Option[]
  value        : string
  onChange     : (id: string) => void
  placeholder  : string
  createLabel  : string
  onCreate     : (name: string) => Promise<{ id: string; label: string } | null>
}

export default function CreatableCombobox({
  options, value, onChange, placeholder, createLabel, onCreate,
}: Props) {
  const [open,     setOpen]     = useState(false)
  const [query,    setQuery]    = useState('')
  const [creating, setCreating] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.id === value)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const exactMatch = options.some(
    o => o.label.toLowerCase() === query.trim().toLowerCase()
  )
  const showCreate = query.trim().length > 0 && !exactMatch

  const handleCreate = async () => {
    if (!query.trim() || creating) return
    setCreating(true)
    const result = await onCreate(query.trim())
    if (result) {
      onChange(result.id)
      setQuery('')
      setOpen(false)
    }
    setCreating(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full h-11 px-3 border rounded-lg text-sm text-left transition-colors"
        style={{
          background  : 'var(--bg-input)',
          borderColor : open ? 'var(--accent)' : 'var(--border-dim)',
          color       : selected ? 'var(--text-primary)' : 'var(--text-dim)',
        }}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--text-dim)' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl border shadow-2xl overflow-hidden"
          style={{
            background  : 'var(--bg-card)',
            borderColor : 'var(--accent-border)',
            boxShadow   : '0 8px 32px rgba(0,0,0,0.25)',
          }}
        >
          {/* Search input */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--border-dim)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && showCreate) handleCreate()
                if (e.key === 'Escape') { setOpen(false); setQuery('') }
              }}
              placeholder={`Search or type to create…`}
              className="w-full bg-transparent text-sm outline-none px-2 py-1"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && !showCreate && (
              <p className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-dim)' }}>
                No results found
              </p>
            )}

            {filtered.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id)
                  setQuery('')
                  setOpen(false)
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={e =>
                  (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'}
                onMouseLeave={e =>
                  (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <Check
                  className="w-3.5 h-3.5 shrink-0"
                  style={{
                    color   : 'var(--accent)',
                    opacity : opt.id === value ? 1 : 0,
                  }}
                />
                {opt.label}
              </button>
            ))}

            {/* Create new option */}
            {showCreate && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left border-t transition-colors"
                style={{
                  borderColor : 'var(--border-dim)',
                  color       : 'var(--accent)',
                }}
                onMouseEnter={e =>
                  (e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'}
                onMouseLeave={e =>
                  (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                {creating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Plus className="w-3.5 h-3.5" />
                }
                {creating ? 'Creating…' : `${createLabel} "${query.trim()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}