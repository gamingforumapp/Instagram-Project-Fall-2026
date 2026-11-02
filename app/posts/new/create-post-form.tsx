'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/database.types'
import { createPost } from '@/lib/posts/actions'
import {
  IMAGE_EXTENSIONS,
  MAX_CONTENT_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_TITLE_LENGTH,
} from '@/lib/posts/constants'

type CreatePostFormProps = {
  userId: string
  communities: Pick<Tables<'communities'>, 'id' | 'name'>[]
}

export default function CreatePostForm({
  userId,
  communities,
}: CreatePostFormProps) {
  const supabase = createClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const [communityId, setCommunityId] = useState('')
  const [tab, setTab] = useState<'text' | 'images'>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [posted, setPosted] = useState(false)

  const previewUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image]
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const removeImage = () => {
    setImage(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg(null)
    setPosted(false)
    if (!IMAGE_EXTENSIONS[file.type]) {
      setErrorMsg('Images must be PNG, JPEG, WebP, or GIF.')
      removeImage()
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorMsg('Images can be up to 5 MB.')
      removeImage()
      return
    }

    setImage(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setPosted(false)
    setLoading(true)

    let imagePath: string | null = null

    if (image) {
      const path = `${userId}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[image.type]}`
      const { error } = await supabase.storage
        .from('post-images')
        .upload(path, image, { contentType: image.type })

      if (error) {
        setErrorMsg('Your image could not be uploaded. Please try again.')
        setLoading(false)
        return
      }
      imagePath = path
    }

    let failure: string | null = null
    try {
      const result = await createPost({ communityId, title, content, imagePath })
      if (!result.ok) failure = result.error
    } catch {
      failure = 'Your post could not be saved. Please try again.'
    }

    if (failure) {
      // Don't leave an unused file behind, since it counts against storage.
      if (imagePath) {
        await supabase.storage.from('post-images').remove([imagePath])
      }
      setErrorMsg(failure)
      setLoading(false)
      return
    }

    setCommunityId('')
    setTitle('')
    setContent('')
    removeImage()
    setTab('text')
    setPosted(true)
    setLoading(false)
  }

  const canSubmit = communityId !== '' && title.trim() !== '' && !loading

  const tabClass = (name: 'text' | 'images') =>
    `rounded-t-lg border border-b-2 border-zinc-800 px-4 py-2 text-sm font-semibold transition-colors ${
      tab === name
        ? 'border-b-amber-400 text-white'
        : 'border-b-transparent text-zinc-400 hover:text-zinc-200'
    }`

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      {errorMsg && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      {posted && (
        <div
          role="status"
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400"
        >
          Your post has been published.
        </div>
      )}

      <div>
        <label htmlFor="community" className="sr-only">
          Community
        </label>
        <select
          id="community"
          required
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-sm font-medium text-zinc-200 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          <option value="">Select a community</option>
          {communities.map((community) => (
            <option key={community.id} value={community.id}>
              r/{community.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        <button
          type="button"
          aria-pressed={tab === 'text'}
          onClick={() => setTab('text')}
          className={tabClass('text')}
        >
          Text
        </button>
        <button
          type="button"
          aria-pressed={tab === 'images'}
          onClick={() => setTab('images')}
          className={tabClass('images')}
        >
          Images
        </button>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="relative">
          <label htmlFor="title" className="sr-only">
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            maxLength={MAX_TITLE_LENGTH}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title*"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 py-3 pl-3 pr-20 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <span className="absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
            {title.length}/{MAX_TITLE_LENGTH}
          </span>
        </div>

        {tab === 'text' ? (
          <div>
            <label htmlFor="content" className="sr-only">
              Body text
            </label>
            <textarea
              id="content"
              rows={10}
              maxLength={MAX_CONTENT_LENGTH}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Body text (optional)"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            {image && (
              <p className="mt-2 text-xs text-zinc-400">
                1 image attached: {image.name}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label
              htmlFor="image"
              className="block text-sm font-medium text-zinc-300"
            >
              Image (optional): PNG, JPEG, WebP, or GIF, up to 5 MB
            </label>
            <input
              id="image"
              ref={fileInput}
              type="file"
              accept={Object.keys(IMAGE_EXTENSIONS).join(',')}
              onChange={handleImageChange}
              className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-full file:border file:border-zinc-700 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-100 hover:file:bg-zinc-700"
            />
            {previewUrl && (
              <div className="space-y-2">
                {/* A local preview of the chosen file, so next/image doesn't apply. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview of the selected image"
                  className="max-h-80 rounded-lg border border-zinc-800"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Remove image
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
        {communityId === '' && (
          <p className="text-xs text-zinc-400">Select a community to post.</p>
        )}
      </div>
    </form>
  )
}
