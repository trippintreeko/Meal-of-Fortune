import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AVATARS_BUCKET = 'avatars'

export function useAvatarUpload (authId: string | undefined) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadAvatar = useCallback(async (uri: string): Promise<{ url: string | null; error: string | null }> => {
    if (!authId) return { url: null, error: 'Not signed in' }
    setError(null)
    setUploading(true)
    try {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${authId}/avatar.${ext}`
      const response = await fetch(uri)
      const blob = await response.blob()
      const { data, error: uploadErr } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(fileName, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: true
        })
      if (uploadErr) {
        setError(uploadErr.message)
        return { url: null, error: uploadErr.message }
      }
      const { data: urlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(data.path)
      return { url: urlData.publicUrl, error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      return { url: null, error: msg }
    } finally {
      setUploading(false)
    }
  }, [authId])

  return { uploadAvatar, uploading, error, setError }
}
