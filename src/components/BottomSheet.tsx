import React, { useEffect } from 'react'

export default function BottomSheet(props: {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
}) {
  const { open, onClose } = props

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="overlay" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheetGrab" />
        {props.title ? <div className="sheetTitle">{props.title}</div> : null}
        <div className="sheetBody">{props.children}</div>
      </div>
    </div>
  )
}
