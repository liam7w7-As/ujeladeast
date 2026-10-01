# Guided study on the existing annual plan

This first stage keeps the existing study_plans, study_weeks, study_lessons,
user_progress and journal_entries records. It does not seed, rewrite or delete
lessons, alter existing completed answers, or require a SQL migration.

## Experience

- Continue selects the earliest incomplete lesson ordered by week_number and
  day_number, not the current calendar date. Pagination handles server row caps;
  the displayed ordinal and total come from actual lessons, including day 365.
- Reading, existing teaching (when available), each existing question, and the
  optional personal journal are separate steps with reduced-motion support.
- Empty question definitions are skipped without renumbering stored answer keys.
  Required questions need a non-whitespace answer; required:false is respected.
  There is no word-count requirement, score, answer inference or doctrinal grading.
- Previously completed lessons open in read-only mode. Older empty answers stay
  untouched and no extra XP is granted for rereading.
- Completing a new lesson grants the existing base 10 XP and streak rules, but
  no longer grants extra XP for journals or favorite verses. Existing XP remains.

## Drafts and storage

Drafts are saved synchronously in localStorage, scoped by user ID and lesson ID.
They include answers, the current step, optional journal and verse input. They
survive navigation/reloads in that browser but are not synced across devices.
Clearing browser data removes drafts. Browser profiles/devices should not be
shared when writing sensitive personal reflections; this is not encrypted storage.

Storage failures are shown explicitly and exiting the lesson asks for confirmation.
The account boundary remounts study state to avoid showing another account's draft.
When lesson content changes, the reader starts again; only answers still matching
their question text/index are restored. Changes detected during final submission
require reopening the lesson before saving.

The journal is saved before completion; any failure keeps the draft retryable.
Existing unique user/lesson constraints and conditional progress updates prevent
duplicate completion from overwriting earlier answers. XP/streak writes remain
separate from completion: if that update fails, the UI reports it without undoing
the saved study or pretending the reward succeeded. These writes are not one
database transaction.

## Boundaries

Required-answer validation is in the application and its study hook, not a new
database authorization rule. Existing Supabase RLS remains in force. This feature
does not claim that nonempty answers prove learning or resist direct API abuse.
Reviewed answer criteria, scheduled recall and learning analytics are a later
content-review stage. The admin tracking view continues to measure activity.

## Verification

```sh
node --test tests/studyJourney.test.mjs tests/studyTracking.test.mjs
node tests/studyJourney.browser.mjs
node tests/adminStudyTracking.browser.mjs
```

Browser tests require Playwright and Chrome. The new suite defaults to port 5177;
override STUDY_TEST_URL and STUDY_TEST_OUTPUT for its URL and screenshots. For the
admin suite use TRACKING_TEST_URL and TRACKING_TEST_OUTPUT. All backend responses
are mocked; the 365-day fixture is test data, not a production data export.
