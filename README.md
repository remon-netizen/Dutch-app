# Nederlands: Dutch from A2 to B2

A Dutch course for one learner: an adult whose first language is Ukrainian, who lives in
the Netherlands, reads English well, and wants above all to **get her grammar right and
understand why it is right**. Everything around the Dutch is in English.

It is a static site (plain HTML, CSS and JavaScript modules, no build step, no server, no
account). Progress is kept in the browser; a backup file moves it to another device.

## What is in it

| Screen | What it does |
|---|---|
| **Course path** | 76 units in three levels (A2, B1, B2), one grammar point per unit. A unit has the rule in short, a full explanation, 14–16 words, 10 sentences and 14–16 exercises. |
| **Grammar** | The same grammar points as one list: every rule with its explanation, how the exercises went per rule, the rules that go wrong most, and practice of one rule or mixed. |
| **Irregular verbs** | 148 strong and irregular verbs in 12 groups that change their vowel the same way; the simple past and the perfect (with *heeft* or *is*) are asked. |
| **De or het?** | 401 everyday nouns with their article, plus the nouns of the course as their units are done. Under the verdict: the rule the noun follows, when there is one. |
| **Review** | One queue for everything that was learned (words, sentences, verb forms, articles), each item coming back just before it would be forgotten. |
| **Progress** | Streak, what is learned and due per course, grammar results, the last backup. |

### How a unit is learned

1. **Words**: each is shown (a noun always with *de* or *het*), then recognised among four
   meanings, then typed from its meaning. A noun typed without its article is sent back;
   with the wrong article it is a miss.
2. **Sentences**: copied once with a note on the grammar in it, then typed from the English.
3. **Exercises**, five kinds: choose the form, fill the gap, put the pieces in order,
   rewrite a sentence as instructed, correct a sentence that has one mistake. Under every
   verdict: the whole sentence, what it means, **why** this is the answer, and a button to
   the full rule.

A typed answer has to be exact (capitals and punctuation aside). A near miss, a letter or
two off, gets one more try with the text left in the field; the second try is final. When
a sentence is wrong, the words that differ are marked in both the answer and the right
sentence. "My answer was right too" turns a verdict round where Dutch allows another
answer than the ones listed.

Words and sentences are scheduled with SM-2 (`src/data/course-progress.js`). Exercises are
free practice: what is kept is how each grammar point is going and which exercises were
last answered wrong (`src/data/grammar-progress.js`), and those come back first.

## Files

```
index.html, manifest.json, icon.svg, sw.js
styles/        variables (colours per screen), base, home, course-engine, path, courses, progress
src/
  main.js                 Home, Settings, the Today card, service worker registration
  store.js                localStorage under the app's own prefix (see "One address, two apps")
  router.js               screens and what "back" means
  voice.js                the Dutch text-to-speech voice
  review.js               the review hub: one queue over every course
  progress-ui.js, weak-spots.js, backup.js, backup-ui.js, sheet.js, toast.js
  grammar/
    course-engine.js      runs any round of cards: checking, second try, feedback, score
    drill-core.js         comparing answers, word-by-word difference, shared card pieces
    path-ui.js            the course path, a unit page, word / sentence / exercise cards
    grammar-ui.js         the Grammar screen
    verbs-ui.js           the irregular verbs course
    dehet-ui.js           the de/het trainer
  data/
    path/index.js, a2.js, b1.js, b2.js    the units (generated, see below)
    path-progress.js, grammar-progress.js, verb-progress.js, dehet-progress.js
    course-progress.js    the schedule every course shares
    strong-verbs.js       the irregular verbs, by group
    nouns.js              the everyday nouns and the article rules
    activity.js           the daily log behind the streak
tools/
  path/        the course itself, and the tools that check and build it
  browser/     checks that run the app in a real browser
  build-sw.mjs rewrites the file list in sw.js and raises its version
```

## The course content

The units are written as JSON, one file per unit, in `tools/path/units/`. The app reads
`src/data/path/{a2,b1,b2}.js`, which are generated from them.

| File | What it is |
|---|---|
| `tools/path/syllabus.json` | The plan: 76 units in teaching order, each with its grammar point, the theme of its words, and what the unit must cover and where it stops. |
| `tools/path/spec.md` | The guide for whoever writes or repairs a unit: the learner, the shape of a unit, what makes an exercise sound. |
| `tools/path/brief.mjs <ids>` | Prints the course in one line per unit and the full plan of the units named: a writer's assignment. |
| `tools/path/validate.mjs` | Checks the shape of a unit (`--file unit.json`) or of all of them (`tools/path/units --syllabus tools/path/syllabus.json`). |
| `tools/path/dedupe.mjs [--write]` | A word is taught once: drops from a later unit what an earlier one teaches. |
| `tools/path/lt-check.mjs` | Sends every correct Dutch string through LanguageTool (public API) and lists what it remarks on. |
| `tools/path/assemble.mjs` | Builds `src/data/path/*.js` from the unit files. |

To change a unit: edit its JSON, run `validate.mjs --file`, then `assemble.mjs`, then
`node tools/browser/check-cards.mjs <id>`. Unit ids never change: progress is stored under
them. The order of units is the order of the syllabus.

## Checking the app

Both checks start their own local server and a headless Chrome (node 22 and a Chrome on
the machine are all they need; set `CHROME` if it is somewhere unusual).

- `node tools/browser/check-cards.mjs` answers **every card with its own answer**: all
  units (as a whole-unit round and again from the Grammar screen), all verbs, all nouns,
  then moves the clock a day and reviews everything. A card that rejects the answer it
  shows as correct is a fault in the card or the data.
- `node tools/browser/random-presses.mjs [steps] [seed]` presses random buttons, types
  random text and steps back at random, and reports any error and whether the app was
  ever left.

To look at it yourself: `python3 -m http.server 8124` in this folder, then open
`http://localhost:8124`. On localhost the service worker is not used, so a reload always
shows the current files.

## Publishing

The site is served by GitHub Pages from the `main` branch. Before every push:

```
node tools/path/assemble.mjs     # if a unit changed
node tools/build-sw.mjs          # always: a device only fetches the app again when sw.js changed
```

A device that has the app open gets the new version the next time it comes to the
foreground: on Home it reloads by itself, elsewhere it shows "A new version is ready".

## One address, two apps

This site lives at the same web address (`…github.io`) as the Ukrainian course it grew out
of, and a browser keeps one storage and one cache store per address, not per site. So:

- every key this app stores starts with `dutch.` (`src/store.js`); a backup and a restore
  touch those keys only;
- the service worker only ever deletes caches whose name starts with `dutch-app-`.

The Ukrainian app does the same from its side. Without this, opening both apps on one
device would let each overwrite the other's progress and wipe the other's offline copy.

## Where it came from

The learning method (shown, typed, spaced review, one queue), the session engine, the
router and the backup were taken from the Ukrainian course (`Language-app`) and reworked;
the course content, the exercise kinds, the Grammar screen, the verbs and the de/het
trainer were written for this app. The two are separate projects: a fix to something they
share has to be made in both.
