import { useEffect, useState } from 'react'

/**
 * Uploaded images live in IndexedDB (localStorage is too small for pictures).
 * Blocks only store an `idb:<key>` reference. An in-memory cache keeps images available
 * for the session even when IndexedDB is unavailable (private windows etc.).
 */

const DB = 'smartbook-images'
const STORE = 'images'
const cache = new Map<string, string>()

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(key: string, value: string) {
  const d = await db()
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGet(key: string): Promise<string | undefined> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as string | undefined)
    req.onerror = () => reject(req.error)
  })
}

export const MAX_UPLOAD_MB = 10

/** Reads an image file, downscales large photos and returns a data URL. */
export async function prepareImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG, WebP, GIF or SVG).')
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`The image is larger than ${MAX_UPLOAD_MB} MB.`)
  const original = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('The file could not be read.'))
    r.readAsDataURL(file)
  })
  // keep vector images, animations and small files as they are
  if (file.type === 'image/svg+xml' || file.type === 'image/gif' || file.size < 350 * 1024) return original
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('The image could not be opened.'))
    i.src = original
  })
  const max = 1600
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return original
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const type = file.type === 'image/png' ? 'image/webp' : 'image/jpeg'
  const out = canvas.toDataURL(type, 0.86)
  return out.length < original.length ? out : original
}

/** Stores a data URL and returns the `idb:` reference to keep in the block. */
export async function saveImage(dataUrl: string): Promise<string> {
  const key = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  cache.set(key, dataUrl)
  try {
    await idbPut(key, dataUrl)
  } catch {
    /* session-only fallback: the cache still holds it */
  }
  return `idb:${key}`
}

/** Resolves an `idb:` reference (or a plain URL) to something an <img> can show. */
export function useImageSrc(src: string): { url: string | null; missing: boolean } {
  const key = src.startsWith('idb:') ? src.slice(4) : null
  const [state, setState] = useState<{ url: string | null; missing: boolean }>(() =>
    key ? { url: cache.get(key) ?? null, missing: false } : { url: src || null, missing: !src },
  )
  useEffect(() => {
    if (!key) {
      setState({ url: src || null, missing: !src })
      return
    }
    const hit = cache.get(key)
    if (hit) {
      setState({ url: hit, missing: false })
      return
    }
    let alive = true
    idbGet(key)
      .then(v => {
        if (!alive) return
        if (v) cache.set(key, v)
        setState({ url: v ?? null, missing: !v })
      })
      .catch(() => alive && setState({ url: null, missing: true }))
    return () => {
      alive = false
    }
  }, [src])
  return state
}
