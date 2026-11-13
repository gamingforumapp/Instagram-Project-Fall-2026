'use client'

import Link from 'next/link'
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
    `-mb-px border-b-2 px-1 pb-2 font-semibold transition-colors ${
      tab === name
        ? 'border-[#e9b74e] text-[#e9b74e]'
        : 'border-transparent text-zinc-400 hover:text-white'
    }`

  const fieldClass =
    'w-full rounded-lg border border-[#282c34] bg-[#11151b] text-sm text-[#f4f1eb] placeholder-zinc-500 outline-none focus:border-[#e9b74e]'

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {errorMsg && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {posted && (
        <div
          role="status"
          className="rounded-lg border border-[#5c4426] bg-[#211a11] p-3 text-sm text-[#e7c788]"
        >
          ◎ Your post has been published.
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
          className={`${fieldClass} px-4 py-3`}
        >
          <option value="">Select a community</option>
          {communities.map((community) => (
            <option key={community.id} value={community.id}>
              r/{community.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-5 border-b border-[#1e2228] text-sm">
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

      <div className="space-y-4 rounded-xl border border-[#292d34] bg-[#101319] p-4">
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
            className={`${fieldClass} py-3 pl-4 pr-20`}
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
              className={`${fieldClass} p-4`}
            />
            {image && (
              <p className="mt-2 text-xs text-zinc-400">
                1 image attached: {image.name}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label htmlFor="image" className="block text-sm text-zinc-400">
              Image (optional): PNG, JPEG, WebP, or GIF, up to 5 MB
            </label>
            <input
              id="image"
              ref={fileInput}
              type="file"
              accept={Object.keys(IMAGE_EXTENSIONS).join(',')}
              onChange={handleImageChange}
              className="block w-full text-sm text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-solid file:border-[#30343b] file:bg-transparent file:px-3 file:py-2 file:text-sm file:text-[#f4f1eb] hover:file:bg-[#171b22]"
            />
            {previewUrl && (
              <div className="space-y-2">
                {/* A local preview of the chosen file, so next/image doesn't apply. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview of the selected image"
                  className="max-h-80 rounded-lg border border-[#292d34]"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="rounded-lg border border-[#30343b] px-3 py-2 text-xs hover:bg-[#171b22]"
                >
                  Remove image
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {communityId === '' && (
          <p className="mr-auto text-xs text-zinc-400">
            ♙ Select a community to post.
          </p>
        )}
        <Link
          href="/"
          className="rounded-lg border border-[#30343b] px-4 py-2 text-sm hover:bg-[#171b22]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-[#e9b74e] px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  )
}
