# Vitale Backend — Future Improvements

Running backlog of backend-only improvements deferred for later. Add new items as
bullet points; keep this file backend-specific (no dashboard/frontend notes).

## Authorization (once auth lands)

- **Enforce author-only edits on notes at the API, not just the UI.** `PATCH`/`DELETE /v1/notes/:id`
  currently let any caller modify any note. Compare the authenticated doctor id to `note.doctorId`
  and return **403** otherwise.
- **Guard who can add records to a patient.** Add-note / add-medication / add-vaccine accept any caller;
  gate them behind authentication (and, where relevant, role checks) when auth is wired.

## Data integrity

- **Validate `patientId` on write.** Add/list across all four modules trust the `patientId` param with no
  existence check — a note/medication/vaccine can be created for a non-existent patient (orphan). Add an
  existence guard (or a real FK) once patients + records share infrastructure.
- **NIN uniqueness (409).** `create-patient` documents a 409 for `NIN_ALREADY_REGISTERED`, but the
  in-memory repo never enforces it. Add a unique constraint (and map the DB error to the domain error)
  when the real DB lands.

## Denormalization maintenance (doctor-note)

- **Reconcile the denormalized doctor snapshot on profile change.** Notes store `doctorName` /
  `specialty` / `doctorAvatar` at write time. When a doctor updates their profile, propagate the change
  to their notes (e.g. Mongo `updateMany({ doctorId }, { $set: … })`) via a background/event handler —
  eventual consistency, keeps reads join-free.

## Query / performance

- **Push list sorting into the repository/query.** `get-patient-notes` sorts newest-first in the
  controller; with a real store use `sort({ createdAt: -1 })` + a `createdAt` index instead of in-memory
  sorting.
- **Paginate unbounded lists.** A patient's notes / medications / vaccines grow without limit — add
  pagination (limit/offset or cursor) to the list endpoints before they get large.

## Infrastructure

- **Swap in-memory repositories for real adapters behind the existing ports.** Primary DB (e.g. Postgres)
  for patient/medication/vaccine; separate Mongo store for doctor-notes (fast read/write, denormalized).
  The ports (`I*Repository`) already isolate this — only `src/persistence/**` should change.

## Default Seeding

- **Default vaccines sseding.** when patient created for the first time in system that must fire an event
  to seed default vaccines based on ALgerian health care system ( in-search )
