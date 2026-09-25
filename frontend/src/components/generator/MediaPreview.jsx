// frontend/src/components/generator/MediaPreview.jsx
import { useState } from 'react'
import { Download } from 'lucide-react'
import { useDownload } from '@/hooks/useContent'

export function MediaPreview({ imageUrl, videoUrl, contentId, platform }) {
  const [downloading, setDownloading] = useState(null)
  const { downloadImage, downloadVideo } = useDownload()

  const handleDownload = async (type) => {
    setDownloading(type)
    try {
      if (type === 'image') await downloadImage(contentId, platform)
      else                  await downloadVideo(contentId, platform)
    } finally {
      setDownloading(null)
    }
  }

  const hasMedia = imageUrl || videoUrl

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">🎨 Médias Générés</h2>

      {!hasMedia && (
        <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3">🖼️</div>
          <p className="text-sm">Aucun média généré</p>
          <p className="text-xs mt-1 text-gray-300">Activez "Image" ou "Vidéo" dans le formulaire</p>
        </div>
      )}

      {/* Image SDXL-Turbo */}
      {imageUrl && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">🖼️ Image — SDXL-Turbo</span>
            <button
              onClick={() => handleDownload('image')}
              disabled={downloading === 'image'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {downloading === 'image'
                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Téléchargement...</>
                : <><Download className="h-3.5 w-3.5" /> PNG</>}
            </button>
          </div>
          <img
            src={imageUrl}
            alt="Image générée par IA"
            className="w-full object-contain"
            style={{ maxHeight: '400px' }}
          />
          <p className="text-xs text-gray-400 text-center py-2">
            Généré avec SDXL-Turbo · HuggingFace · 1024×1024
          </p>
        </div>
      )}

      {/* Vidéo ModelScope T2V */}
      {videoUrl && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">🎬 Vidéo — ModelScope T2V</span>
            <button
              onClick={() => handleDownload('video')}
              disabled={downloading === 'video'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {downloading === 'video'
                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Téléchargement...</>
                : <><Download className="h-3.5 w-3.5" /> MP4</>}
            </button>
          </div>
          <video
            src={videoUrl}
            controls
            loop
            className="w-full"
            style={{ maxHeight: '350px' }}
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
          <p className="text-xs text-gray-400 text-center py-2">
            Généré avec ModelScope T2V · HuggingFace
          </p>
        </div>
      )}
    </div>
  )
}