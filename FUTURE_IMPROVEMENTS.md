# Future Improvements

## Storage integrity — large presigned uploads

### Context
`R2StorageProvider.verifyExists` (used by the presigned → confirm flow in
`confirm-upload.controller.ts`) returns the object's R2 `ETag` as the
`sha256Digest` that `Attachment.confirm` persists.

### Current behavior
This is correct **today** because the per-type `AttachmentType` constraints cap
single-part uploads at 20 MB (`request-presigned-upload.controller.ts` passes
`maxBytes`, and `Attachment.confirm` re-runs `assertSizeWithinLimit`). R2 objects
uploaded as a single `PUT` (≤ 5 GB) produce an MD5-based ETag, so the digest is
trustworthy.

### When it breaks
R2 ETags are **not** MD5 (and not sha256) for multipart-uploaded objects. If KYC
document limits are raised above what's practical to single-part PUT, or if a
client switches to a multipart-capable presigned upload for very large files,
`verifyExists` would record a composite/incorrect digest.

### Fix to apply if uploads ever go multipart
1. Have the client compute and set the object's sha256 as a custom PUT header,
   e.g. `x-amz-meta-sha256`, when requesting the presigned URL (extend
   `createPresignedUpload` to also return a fixed header key the client must send).
2. Change `verifyExists` to read that custom header from `HeadObject` and return
   it as `sha256Digest` instead of the ETag.
3. Fall back to the ETag→MD5 path only for single-part uploads (or drop it
   entirely once #1 is in place for every path).

### Status
Not needed for the current 20 MB ceiling; keep this note before raising KYC
upload limits or adopting S3 multipart uploads.
