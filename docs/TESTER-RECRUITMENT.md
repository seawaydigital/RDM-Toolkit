# Formal User Testing — Recruitment & Protocol

**Status:** TEMPLATE — fill in the `[TBD]` fields before sending.

This doc covers who we're testing with, what we're testing, and how we judge "passed." Keep it short; we're validating that researchers can use the tools, not running a PhD-grade study.

---

## Goals

We want answers to three questions:

1. **Can a researcher complete a real RDM task with the toolkit in under 10 minutes without asking for help?** (Task success + time-on-task)
2. **Do they trust the "nothing leaves your browser" claim enough to upload real research data?** (Trust / mental model)
3. **What breaks, confuses, or annoys them?** (Qualitative — bug-list + friction points)

Non-goals: we are not measuring NPS, we are not A/B testing copy, we are not validating specific tools' algorithmic quality.

---

## Recruitment

### Target: [TBD — my suggestion: 8–12 testers]

Small-N moderated testing hits saturation fast. Nielsen's "5 users find 85% of issues" heuristic applies here; 8–12 gives us coverage across personas with a safety margin.

### Personas to recruit

Fill in how many of each. My suggestion in brackets.

| Persona | Count | Why they matter |
|---|---|---|
| Graduate student (STEM, handles data) | [TBD — 3?] | Primary audience; most PDF/CSV/de-identify workflows |
| Graduate student (SSHRC / qualitative) | [TBD — 2?] | Tests the de-identify + transcript workflows, OCAP® framing |
| Faculty PI (grant-writing, DMP) | [TBD — 2?] | Tests the research-resources pages, Tri-Agency messaging |
| Research office / RDM librarian staff | [TBD — 2?] | Tests whether we'd recommend this to their researchers |
| Office admin (non-researcher, PDF-heavy workflow) | [TBD — 1?] | Sanity check on the "just a useful PDF suite" entry point |

**Recruitment channels:**
- Email to Dr. Ayeni's RDM contact list
- Posted flyer in Chancellor Paterson Library
- Slack / Teams post in relevant Lakehead research channels
- [TBD — any other channels?]

### Incentive

[TBD — e.g. $20 Tim Hortons card per 45-min session, or coffee and a thank-you]

### Screener questions

1. Do you currently handle research data (any format) as part of your work or studies?
2. Do you have a laptop you can bring to the session? (Needed because this is a browser tool; we want to test on their real device.)
3. Any assistive technology (screen reader, magnifier, keyboard-only)? (We need at least 1 AT user if possible.)

---

## Session Format

- **Duration:** 45 min (5 intro + 30 tasks + 10 debrief)
- **Location:** [TBD — in-person at Lakehead / remote via Zoom / hybrid?]
- **Tool:** Their own laptop, their own browser. No screen-share software pre-installed unless remote.
- **Recording:** Audio + screen, with consent. Stored locally, deleted after analysis.
- **Moderator:** [TBD — who's running the sessions? 1 moderator, optional 1 note-taker]

### Pre-session checklist

- [ ] Signed consent form (audio/screen recording, anonymous quote use)
- [ ] Browser: whatever they normally use; note it in the session record
- [ ] Pre-loaded test files on a USB stick or shared folder (see Test Artifacts below)
- [ ] Moderator has `docs/MOBILE-SWEEP.md` and `docs/BROWSER-SUPPORT.md` open for real-device notes

---

## Tasks

Each tester attempts **3–4 tasks** from the list below, rotated so every task gets ≥3 testers. Tasks are real RDM workflows drawn from Tri-Agency DMP requirements and typical grad-student pain points.

### Task Bank

| # | Task | Primary tool(s) | Pass criteria | Rough time |
|---|---|---|---|---|
| 1 | "You have a 30-page PDF thesis draft with your supervisor's name and home address on the cover. Remove those details before sharing." | PDF Redaction | Redacted PDF downloads; text is not recoverable via copy-paste | 5 min |
| 2 | "You have a CSV of 200 survey responses with participant names in column A. Produce a de-identified version to share with a collaborator, and keep a key file you could use to re-identify if needed." | De-identify Research Data | Output CSV has pseudonyms; key file downloaded and understood as sensitive | 7 min |
| 3 | "Your DMP needs a storage estimate. Your project will generate ~500 GB of microscopy images over 3 years. Produce a storage-needs summary you could paste into your DMP." | Storage Calculator | Exported text block suitable for DMP; 7-year LUFA retention flagged | 5 min |
| 4 | "Combine three scanned PDF pages into one document, add page numbers, and password-protect it." | Merge PDFs → Add Page Numbers → Password Protect PDF | Final PDF opens with password; page numbers visible | 8 min |
| 5 | "Take this photo (contains GPS metadata) and produce a version safe to post publicly." | Strip Image Metadata | Output image has no EXIF GPS; tester can verify via a second tool or DevTools | 4 min |
| 6 | "Compress this 50 MB PDF so it fits in a 25 MB email attachment." | Compress PDF | Output < 25 MB; tester understands smart vs aggressive trade-off | 5 min |
| 7 | "Your REB needs you to encrypt a sensitive transcript before emailing it. Encrypt the text, send the ciphertext and password through different channels." | Encrypt/Decrypt Text | Ciphertext generated; tester understands why password goes separately | 6 min |
| 8 | "You have a PDF form you need to fill out and sign. Fill it in and add your signature." | Fillable PDF Form OR Sign PDF | Completed PDF with visible signature | 7 min |
| 9 | "You're about to submit a grant. Classify your project's dataset (pick a realistic scenario: anonymized survey data, patient records, etc.) and note the required controls." | Data Classification | Classification complete; tester can articulate the required controls | 4 min |
| 10 | "Find a tool you didn't know existed on this site." | Search / Sidebar / Home | Tester discovers something; note how they got there | 3 min |

### Task rotation suggestion

Each tester gets 3 tasks drawn from different columns:

| Tester # | Task A (PDF) | Task B (data) | Task C (resource page) |
|---|---|---|---|
| 1 | 1 | 2 | 3 |
| 2 | 4 | 5 | 9 |
| 3 | 6 | 7 | 10 |
| … | rotate | rotate | rotate |

[TBD — adjust rotation once tester count is final]

---

## Test Artifacts

Prepare these before the first session, store on a USB stick / shared folder:

- `sample-thesis.pdf` — 30-page PDF with fake supervisor name + address on cover
- `survey-responses.csv` — 200 rows with Name / Email / Age / Score columns
- `microscopy-placeholder.txt` — just a note reminding the tester the file is hypothetical for the storage calculator
- `scanned-page-1.pdf`, `scanned-page-2.pdf`, `scanned-page-3.pdf` — three 1-page PDFs
- `sample-with-gps.jpg` — a photo with GPS EXIF tag set
- `large-report.pdf` — ~50 MB PDF (padded with images)
- `sensitive-transcript.txt` — a short fake interview transcript
- `sample-form.pdf` — a flat PDF that looks fillable
- **No real research data in test artifacts.** This is important — we're not here to collect PHI.

---

## Metrics We Record

Per task, per tester:

- **Success:** completed / completed with help / abandoned
- **Time on task:** stopwatch, start when they read the prompt, stop at download / confirmation
- **Errors encountered:** any error boundary? any console error? (moderator checks DevTools after)
- **Trust moment:** did the tester hesitate before uploading? Did they ask "is this safe?" or check the privacy claim?
- **Qualitative notes:** direct quotes, frustrations, delighters

Post-session:

- **SUS score** (System Usability Scale, 10 questions, ~2 min) — industry-standard benchmark; 68+ = above average
- **Open debrief questions:**
  1. Would you use this for real work tomorrow? Why or why not?
  2. What would you tell a colleague about it?
  3. What's the first thing you'd change?
  4. Did anything make you doubt the "nothing leaves your browser" claim?

---

## Pass Criteria for Launch

The whole round "passes" and we ship if:

- [ ] ≥ 80% of task attempts completed without moderator help
- [ ] Average SUS score ≥ 70
- [ ] Zero task attempts resulted in data loss or a security-relevant misunderstanding (e.g., no tester thought redaction just painted over text without removing it)
- [ ] No P0/P1 bugs found (P0 = tool crashes, P1 = produces wrong output silently)
- [ ] ≥ 3 testers spontaneously mention the privacy model as a positive

If we miss any of these, we fix and re-test that specific area with 2–3 additional testers before launch. We do not re-run the whole battery.

---

## Timeline

| Milestone | Date | Owner |
|---|---|---|
| Recruitment emails go out | [TBD] | [TBD] |
| First session | [TBD] | [TBD] |
| Last session | [TBD] | [TBD] |
| Analysis + triage meeting | [TBD] | [TBD] |
| Fix sprint (if needed) | [TBD] | [TBD] |
| Launch | [TBD] | [TBD] |

---

## What I Need From You

Before recruitment starts, fill in:

1. **Tester count** per persona (the [TBD] in the Recruitment section)
2. **Incentive** amount/form
3. **Session format** — in-person, remote, or hybrid?
4. **Moderator** — who's running it? One person or two?
5. **Timeline** — when do you want to launch? Everything backs up from there.
6. **Recruitment channels** — beyond Dr. Ayeni's list, is there a faculty mailing list / library channel we should use?
7. **Task bank pruning** — 10 tasks is a lot. Pick your top 6–8 if you want to narrow.

Once those are filled, I can produce the participant-facing recruitment email, consent form, and per-session script.
