import { describe, it, expect } from "vitest"
import { getUploadValidationError, hasAllowedExtension } from "./page"

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  const content = new Uint8Array(Math.max(sizeBytes, 1))
  return new File([content], name, { type })
}

describe("getUploadValidationError — HEIC support and MIME fallback", () => {
  it("accepts a HEIC file with a trustworthy image/heic MIME type", () => {
    const file = makeFile("id-front.heic", "image/heic")
    expect(getUploadValidationError(file)).toBeNull()
  })

  it("accepts a HEIF file with a trustworthy image/heif MIME type", () => {
    const file = makeFile("id-front.heif", "image/heif")
    expect(getUploadValidationError(file)).toBeNull()
  })

  it("falls back to the file extension when file.type is empty", () => {
    const file = makeFile("id-front.jpg", "")
    expect(getUploadValidationError(file)).toBeNull()
  })

  it("falls back to the file extension when file.type is application/octet-stream", () => {
    const file = makeFile("id-front.png", "application/octet-stream")
    expect(getUploadValidationError(file)).toBeNull()
  })

  it("accepts a HEIC file even when the browser reports application/octet-stream instead of image/heic", () => {
    const file = makeFile("id-front.heic", "application/octet-stream")
    expect(getUploadValidationError(file)).toBeNull()
  })

  it("rejects an untrustworthy MIME type when the extension isn't in the allowed list", () => {
    const file = makeFile("payload.exe", "application/octet-stream")
    expect(getUploadValidationError(file)).toMatch(/only jpg, png, webp, pdf, and heic\/heif/i)
  })

  it("rejects a disallowed MIME type even if the file name has an allowed-looking extension", () => {
    // file.type is trustworthy (not octet-stream) here, so it's judged on the
    // MIME type itself, not the extension — a mismatched/spoofed extension
    // shouldn't be able to sneak a disallowed type through.
    const file = makeFile("id-front.jpg", "image/gif")
    expect(getUploadValidationError(file)).toMatch(/only jpg, png, webp, pdf, and heic\/heif/i)
  })

  it("rejects a file with no extension and an untrustworthy MIME type", () => {
    const file = makeFile("scan", "application/octet-stream")
    expect(getUploadValidationError(file)).not.toBeNull()
  })
})

describe("hasAllowedExtension", () => {
  it("accepts .heic and .heif (case-insensitively)", () => {
    expect(hasAllowedExtension("photo.heic")).toBe(true)
    expect(hasAllowedExtension("PHOTO.HEIF")).toBe(true)
  })

  it("rejects extensions outside the allowed set", () => {
    expect(hasAllowedExtension("payload.exe")).toBe(false)
    expect(hasAllowedExtension("no-extension")).toBe(false)
  })
})
