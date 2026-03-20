'use client'


interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string | React.ReactNode
  confirmText: string
  confirmStyle?: 'danger' | 'warning' | 'success'
  isLoading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmStyle = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const confirmClass =
    confirmStyle === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : confirmStyle === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-black'
      : 'bg-[#00E5A0] hover:bg-[#00E5A0]/90 text-black'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-32">
      <div className="bg-[#111111] border border-zinc-800 p-8 max-w-md w-full mx-4">
        <h2 className="font-syne text-xl font-bold text-white">{title}</h2>
        <div className="text-zinc-400 mt-2 mb-6 text-sm leading-relaxed">{description}</div>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-zinc-400 hover:text-white px-4 py-2 text-sm px-6 py-2.5 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`${confirmClass} px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2`}
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
