/**
 * Minimal magic-byte sniffing for the media types Vitale accepts — no external
 * dependency. Returns the MIME implied by the file's actual leading bytes, or
 * null if unrecognized. This is the real defense against Content-Type spoofing:
 * a `.exe`/`.svg`/`.html` renamed and sent as `image/jpeg` will not match here.
 */
export function detectMimeFromBytes(buffer: Buffer): string | null {
  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP: "RIFF"...."WEBP"
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  // PDF: "%PDF-"
  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') {
    return 'application/pdf';
  }

  return null;
}
