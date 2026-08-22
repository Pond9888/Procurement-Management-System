'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Paperclip, Trash2, Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SupportingDoc } from '@/types'

interface DocUploadProps {
  grdId: string
  initialDocs: SupportingDoc[]
}

export function DocUpload({ grdId, initialDocs }: DocUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<SupportingDoc[]>(initialDocs)
  const [uploading, setUploading] = useState(false)
  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function uploadFile(file: File) {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(`/api/grd/${grdId}/upload`, { method: 'POST', body: form })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error?.message ?? 'อัปโหลดไม่สำเร็จ')
        return
      }
      setDocs((prev) => [...prev, json.data.doc])
      toast.success(`แนบไฟล์ "${file.name}" เรียบร้อย`)
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาดในการอัปโหลด')
    } finally {
      setUploading(false)
    }
  }

  async function deleteDoc(name: string) {
    setDeletingName(name)
    try {
      const res = await fetch(
        `/api/grd/${grdId}/upload?name=${encodeURIComponent(name)}`,
        { method: 'DELETE' }
      )
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error?.message ?? 'ลบไฟล์ไม่สำเร็จ')
        return
      }
      setDocs((prev) => prev.filter((d) => d.name !== name))
      toast.success('ลบไฟล์เรียบร้อย')
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาดในการลบไฟล์')
    } finally {
      setDeletingName(null)
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    Array.from(files).forEach(uploadFile)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังอัปโหลด...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <UploadCloud className="h-8 w-8 text-muted-foreground/50" />
            <span>ลากไฟล์มาวาง หรือ <span className="text-primary font-medium">คลิกเพื่อเลือก</span></span>
            <span className="text-xs">PDF, JPG, PNG, DOCX, XLSX — สูงสุด 10 MB ต่อไฟล์</span>
          </div>
        )}
      </div>

      {/* File list */}
      {docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.name}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-primary hover:underline"
                >
                  {doc.name}
                </a>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {doc.type} · {(doc.size / 1024).toFixed(0)} KB
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  disabled={deletingName === doc.name}
                  onClick={() => deleteDoc(doc.name)}
                >
                  {deletingName === doc.name ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
