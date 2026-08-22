'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PDFButtonProps {
  grdId: string
  existingUrl: string | null
}

export function PDFButton({ grdId, existingUrl }: PDFButtonProps) {
  const [loading, setLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(existingUrl)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/grd/${grdId}/pdf`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'สร้าง PDF ไม่สำเร็จ')
      } else {
        setPdfUrl(json.data.pdf_url)
        toast.success('สร้าง PDF เรียบร้อยแล้ว')
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  if (pdfUrl) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <FileDown className="h-4 w-4" />
          ดาวน์โหลด PDF
        </a>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin inline" /> : 'สร้างใหม่'}
        </button>
      </div>
    )
  }

  return (
    <Button variant="outline" onClick={handleGenerate} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      สร้าง PDF
    </Button>
  )
}
