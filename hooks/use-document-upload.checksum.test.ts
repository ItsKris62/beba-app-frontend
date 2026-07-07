// @vitest-environment node
//
// Run in the Node environment rather than jsdom: jsdom's crypto.subtle runs
// against Node's native WebCrypto bindings from inside a separate VM
// context, so an ArrayBuffer produced by a jsdom-context File/Blob fails
// SubtleCrypto's internal type check even though the bytes are fine. That's
// a jsdom/vitest environment quirk, not a bug in computeDocumentChecksum —
// in a real single-realm browser (or here, under plain Node) it works as
// written.
import { describe, expect, it } from 'vitest';
import { computeDocumentChecksum, validateDocumentFile } from './use-document-upload';

describe('computeDocumentChecksum', () => {
  it('computes a SHA-256 hex digest via the Web Crypto API', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const checksum = await computeDocumentChecksum(file);
    // Known SHA-256 digest of the ASCII string "hello"
    expect(checksum).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('produces different checksums for different content', async () => {
    const a = await computeDocumentChecksum(new File(['a'], 'a.txt'));
    const b = await computeDocumentChecksum(new File(['b'], 'b.txt'));
    expect(a).not.toBe(b);
  });
});

describe('validateDocumentFile', () => {
  it('accepts an allowed type and size', () => {
    const file = new File(['x'], 'id.jpg', { type: 'image/jpeg' });
    expect(validateDocumentFile(file)).toBeNull();
  });

  it('rejects a disallowed MIME type even if the extension looks right', () => {
    // Simulates a renamed/spoofed file (e.g. a .exe renamed to .jpg) or a
    // drag-and-drop bypassing the <input accept> hint.
    const file = new File(['x'], 'id.jpg', { type: 'application/x-msdownload' });
    expect(validateDocumentFile(file)).toMatch(/unsupported file type/i);
  });

  it('rejects a file larger than 5MB', () => {
    const bigContent = new Uint8Array(5 * 1024 * 1024 + 1);
    const file = new File([bigContent], 'scan.pdf', { type: 'application/pdf' });
    expect(validateDocumentFile(file)).toMatch(/5 MB or smaller/i);
  });

  it('accepts each allowed MIME type', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) {
      const file = new File(['x'], 'doc', { type });
      expect(validateDocumentFile(file)).toBeNull();
    }
  });
});
