'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, FileSpreadsheet, Trash2, Download, RefreshCw } from 'lucide-react'

type StoredFile = {
  name      : string
  size      : number
  created_at: string
  type      : 'pdf' | 'xlsx'
}

export default function BomDownloads() {
  const [files,     setFiles]     = useState<StoredFile[]>([])
  const [loading,   setLoading]   = useState(true)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.storage.from('bom-outputs').list('', {
      sortBy: { column: 'created_at', order: 'desc' },
    })
    setFiles(
      (data ?? [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => ({
          name      : f.name,
          size      : f.metadata?.size ?? 0,
          created_at: f.created_at ?? '',
          type      : f.name.endsWith('.pdf') ? 'pdf' : 'xlsx',
        }))
    )
    setLoading(false)
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  const handleDownload = async (name: string) => {
    setDownloading(name)
    const sb = createClient()
    const { data } = await sb.storage.from('bom-outputs').download(name)
    if (data) {
      const url = URL.createObjectURL(data)
      const a   = document.createElement('a')
      a.href    = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    }
    setDownloading(null)
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    setDeleting(name)
    const sb = createClient()
    await sb.storage.from('bom-outputs').remove([name])
    setFiles(prev => prev.filter(f => f.name !== name))
    setDeleting(null)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024)         return `${bytes} B`
    if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Saved Files
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            BOM label PDFs and consolidated breakup spreadsheets
          </p>
        </div>
        <button onClick={loadFiles}
          className="w-8 h-8 rounded-lg flex items-center justify-center border"
          style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* File list */}
      {loading ? (
        <div className="py-10 text-center">
          <RefreshCw className="w-5 h-5 mx-auto animate-spin opacity-30" style={{ color: 'var(--text-primary)' }} />
        </div>
      ) : files.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <FileText className="w-8 h-8 mx-auto opacity-20" style={{ color: 'var(--text-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No saved files yet</p>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Generated PDFs and spreadsheets will appear here
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border-dim)' }}>
          {files.map(file => (
            <div key={file.name}
              className="flex items-center gap-3 px-5 py-3">
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: file.type === 'pdf' ? '#ef444415' : '#10b98115',
                  border    : `1px solid ${file.type === 'pdf' ? '#ef444430' : '#10b98130'}`,
                }}>
                {file.type === 'pdf'
                  ? <FileText       className="w-4 h-4" style={{ color: '#ef4444' }} />
                  : <FileSpreadsheet className="w-4 h-4" style={{ color: '#10b981' }} />
                }
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {file.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  {formatSize(file.size)} · {formatDate(file.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleDownload(file.name)}
                  disabled={downloading === file.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-50"
                  style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Download className="w-3 h-3" />
                  {downloading === file.name ? '…' : 'Download'}
                </button>
                <button
                  onClick={() => handleDelete(file.name)}
                  disabled={deleting === file.name}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-50"
                  style={{ borderColor: '#ef444430', color: '#ef4444', background: '#ef444408' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}