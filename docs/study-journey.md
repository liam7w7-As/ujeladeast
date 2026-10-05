# Guided study on the existing annual plan

The guided study keeps the existing study_plans, study_weeks, study_lessons,
user_progress and journal_entries records. It does not seed, rewrite or delete
lessons or alter existing completed answers. Weekly completion enforcement and
shared daily AI now have additional migrations; see `supabase/README.md`.

## Weekly progression and daily discovery

The home view prioritizes the next study, the current week's lesson buttons,
the streak, journal and daily discovery. The public footer is desktop-only
(1280px and above), uses the real logo and links to existing routes.

The earliest unfinished week is open, along with earlier weeks. Each following
week opens after all lessons of all preceding weeks in the same plan are done.
This is progress-based, not a calendar gate. Lessons within an open week may be
done in any order; empty weeks do not block the journey. Old completions in later
weeks remain available as read-only entries but do not unlock their neighbors.
The trigger in `202610050002_study_week_unlocks.sql` enforces this on completion
even for old clients. Existing read RLS is not changed; this is progression
control, not a confidentiality restriction on the lesson catalog.

Daily discovery currently rotates 12 editorial facts with Bible references.
Its optional AI question is shared, server-generated and labeled as AI. The
model cannot replace the fact or reference. No answers, journal text, profile
or chat history are sent to generate it. Date rollover is America/La_Paz.
Unavailable AI or missing configuration leaves the editorial question usable,
including offline. There is at most one generation attempt per server day,
including failed/time-out attempts, and a 150 output-token limit. This cap is
only for daily discovery, not the existing chat; monetary cost depends on the
configured OpenRouter model.

`tests/studyWeeks.sql.mjs` checks triggers and daily-claim privileges using
PGlite. `tests/dailyBibleFact.test.mjs` mocks the provider and cache to check
parallel requests, authorization, invalid output, failure and midnight.

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
After installing `202610050001_atomic_study.sql`, progress, XP, streak and milestone
notifications commit in one server transaction. The server locks per user, stamps
the date, validates the content revision and required answers, and preserves the
first completion across retries. A lost response can be retried without extra XP.
The active streak and seven-day history come from saved completion dates in Bolivia.
Read failures show an error/retry instead of a zero; returning online or to the
window refreshes the status, as does a visible-page one-minute timer.

Until that SQL is installed the frontend retains the previous separate-write
path for deployment compatibility, including its existing warning on partial
success. Only an explicitly missing RPC allows this path, not failed or ambiguous
save responses. Vercel does not install SQL; see `supabase/README.md` for rollout.

## Boundaries

Required-answer validation is in both the application and, once installed, the
atomic RPC. The migration revokes direct progress/streak writes from API roles.
Existing read RLS and protection of profile roles/lesson editing must be verified
in production. Nonempty answers do not prove learning. Historic timestamps/XP are
not rewritten automatically; missing/incorrect historical data needs review.
Reviewed answer criteria, scheduled recall and learning analytics are a later
content-review stage. The admin tracking view continues to measure activity.

## Verification

```sh
node --test tests/studyJourney.test.mjs tests/studyTracking.test.mjs
node tests/studyJourney.browser.mjs
node tests/adminStudyTracking.browser.mjs
node tests/studyAtomic.sql.mjs
```

Browser tests require Playwright and Chrome. The new suite defaults to port 5177;
override STUDY_TEST_URL and STUDY_TEST_OUTPUT for its URL and screenshots. For the
admin suite use TRACKING_TEST_URL and TRACKING_TEST_OUTPUT. All backend responses
are mocked; the 365-day fixture is test data, not a production data export.
Set STUDY_ATOMIC_TEST=1 for atomic saves, response loss/retry and status errors;
leave it unset for legacy compatibility. SQL tests require PGlite in NODE_PATH
and use a disposable schema, not a production database or concurrency load test.
