# Writing a unit of the Dutch course

This is the guide for whoever writes or repairs a unit. A unit is one JSON file,
`tools/path/units/<id>.json`. `tools/path/syllabus.json` says what each unit is about,
`tools/path/units/a2-01.json` is a finished unit to measure against, and
`node tools/path/validate.mjs --file tools/path/units/<id>.json` checks the shape.

## Who it is for

One learner: an adult whose first language is **Ukrainian**, who lives in the Netherlands
and reads English well. Her Dutch is around A2 and she is working towards B2. What she
cares about most is **getting the grammar right and understanding why it is right**. She
is not a beginner: she knows everyday words and can hold a simple conversation, but her
grammar has gaps and habits she wants to repair properly.

So every unit is built around **one grammar point**, explained fully and practised hard.
The words and the theme are there to give the grammar something real to work on.

## Languages

- Everything around the Dutch is in **English**: explanation, translations, notes. Plain,
  direct English, British spelling. No jargon without saying what it means; give the Dutch
  grammar term once, in brackets, when it is the word she will meet in a Dutch course
  (*the perfect tense (de voltooide tijd)*).
- The Dutch is **standard Netherlands Dutch**, the way an educated speaker writes and
  speaks today. Not Flemish, not bookish, not slang. Use `je/jij` by default and `u` only
  where the situation is formal. Sentences must be things people actually say or write.
- Never invent a rule, a form or an exception. If you are not certain a form exists or a
  sentence is natural, use another one you are certain about.

## The file

```json
{
  "id": "a2-01",
  "level": "A2",
  "icon": "🕘",
  "title": "A normal working day",
  "grammar": "Present tense of regular verbs",
  "summary": "…",
  "explain": "…",
  "words": [ … ],
  "sentences": [ … ],
  "exercises": [ … ]
}
```

`id`, `level`, `icon`, `title` and `grammar` come from the syllabus; copy them unchanged.

### summary

The rule on a cheat sheet: one or two sentences, 40 to 240 characters, plain text with no
markup. It is shown in the list of all grammar points and above the explanation, so it must
make sense on its own: *"ik: the stem. jij, u, hij, zij: stem + t. wij, jullie, zij: the
infinitive. Jij directly after the verb loses its t."*

### explain

The explanation of the grammar point, 2,200 to 4,500 characters. It is what she reads
before practising and what she comes back to when she got something wrong, so it must be
complete enough to answer "why is it like this?" and short enough to read in a few minutes.

Markup (nothing else is rendered, no HTML):

- a blank line starts a new paragraph
- `### Heading` starts a section
- `- ` starts a bullet
- `> Dutch sentence — English translation` is an example line (it gets a 🔊 button; the
  separator is space, em dash, space). At least 6 in a unit.
- a table is a block of lines that start and end with `|`; the first line is the header:
  `| | werken |` then `| ik | werk |` … Use tables for paradigms and for anything with
  two dimensions (de/het against definite/indefinite). 2 to 4 columns, short cells.
- `` `code` `` for a Dutch form inside running English text, `**bold**` for the thing to
  notice, `*italic*` for a term. A wrong form that is shown on purpose gets an asterisk in
  front and no code marks: *ik werkt.

Build it roughly like this, with headings that fit the subject:

1. Two or three sentences: what this is and when Dutch uses it.
2. **The form / the rule**, step by step, with a table where there is a paradigm, and
   example lines directly under each step.
3. **Word order**, whenever the point changes where words go (it very often does in Dutch).
4. **Watch out**: the mistakes learners really make with this point, each with the wrong
   form and the right one.
5. **Compared with Ukrainian**: only where the comparison truly helps, 1 to 4 sentences.
   Typical cases: Dutch has articles and Ukrainian has none; Dutch word order is fixed
   where Ukrainian uses case endings; Dutch cannot drop the subject; Dutch always needs
   `is/zijn` where Ukrainian leaves "є" out; Dutch uses tenses where Ukrainian uses aspect;
   one negation where Ukrainian has two. You may quote a short Ukrainian phrase if it is
   simple and certainly correct. Leave the section out when there is nothing useful to say.
6. Exceptions that are common enough to be worth knowing now. Rare ones stay out.

Stay inside the unit's scope as the syllabus gives it. Do not teach later units' grammar
here; one sentence that points ahead ("more on this in B1") is enough.

### words

14 to 16 **new** words of the unit's theme at the unit's level. They are learned with
typed cards, so choose words worth knowing actively. No proper names, no A1 basics
(`huis`, `eten`, `groot`, the days and numbers), nothing rare. Favour words she needs in
the Netherlands at that level: A2 daily life, B1 work, services, news, opinions, B2
society, study, formal writing. Every word must appear at least once in the unit's
sentences or exercises.

Each word is an object:

| pos | fields | example |
|---|---|---|
| `n` noun | `nl` without article, `art` (`de` or `het`; `het/de` or `de/het` when the official word list allows both for the same meaning, the more usual one first), `pl` (plural, or `""` if it has none), `en` | `{ "nl": "afspraak", "art": "de", "pl": "afspraken", "en": "appointment", "pos": "n" }` |
| `v` verb | `nl` infinitive, `past` (ik-form of the simple past), `perf` (hij-form of the perfect, with the auxiliary), `en` starting with "to" | `{ "nl": "opbellen", "past": "belde op", "perf": "heeft opgebeld", "en": "to call (on the phone)", "pos": "v" }` |
| `adj` `adv` `prep` `conj` `pron` `num` `expr` | `nl`, `en` | `{ "nl": "druk", "en": "busy", "pos": "adj" }` |

- `perf` starts with `heeft `, `is ` or `heeft/is ` (both are used). Check the auxiliary.
- A reflexive verb is written `zich vergissen`; a verb with a fixed preposition may be
  written with it when that is what the unit teaches: `wachten op`.
- A noun that only exists in the plural: `"nl": "kosten", "art": "de", "pl": ""` and
  `"tag": "always plural"`.
- `en`: one meaning, or two separated by ` / `. Short. Add a few words in brackets when
  the English is ambiguous: `"bank": "bank (for money)"`.
- Optional `tag`: a few words shown next to the word (`"separable"`, `"formal"`,
  `"always plural"`, `"no plural"`). Do not repeat what the other fields already say.

### sentences

Exactly 10. Each one uses the unit's grammar point, and together they show its different
sides (every person, a question, a negative, the tricky cases from "Watch out"). She first
copies each sentence, later types it from the English, so:

- 5 to 14 words (up to 18 in B1 and 22 in B2 where the grammar point needs the length), one
  clear meaning, natural.
- Vocabulary: this unit's words, plus common words she can be expected to know at the
  level. Grammar: this unit's point and what earlier units covered (the syllabus lists
  them in order); avoid constructions that later units teach unless the sentence would be
  unnatural without them.
- The English must lead to this Dutch sentence and not to another one. Add a word in
  brackets when English leaves something open: `You (formal) work here.`

```json
{ "nl": "Reis jij vaak voor je werk?", "en": "Do you often travel for your work?",
  "hint": ["reizen", "vaak", "werk"], "note": "reizen → stem reis (z becomes s); jij comes after the verb, so there is no t." }
```

- `hint`: the content words in dictionary form, in the order they appear (2 to 6).
- `note`: one or two sentences that point at the grammar **in this sentence**: which
  form, and why. This is where understanding is built; never write a note that only
  repeats the translation.
- `alt` (optional): other Dutch sentences that are just as right for this English, e.g.
  `"alt": ["Reis je vaak voor je werk?"]`. She types the sentence from the English, and a
  correct sentence that is not listed is marked wrong, so check every time: could it also
  start with the subject, or with the time? `je` or `jij`, `ze` or `zij` after the verb? the
  other order of the two verbs at the end of a sub-clause? If a Dutch speaker would accept
  it for this English, list it. (`we`/`wij` anywhere and `ze`/`zij` as the first word are
  treated as the same by the app; those need no listing.) Do not add clumsy ones.

### exercises

14 to 16, in five kinds. Every exercise has `en` (the English of the complete, correct
sentence) and `note` (**why** this is the answer: the rule, in one or two sentences, also
saying why the tempting wrong answer is wrong where that helps).

**Each exercise must have exactly one right answer, or list every right answer.** This is
the rule that matters most; an exercise that marks a correct Dutch sentence as wrong is
worse than no exercise. Read each one back as a Dutch speaker and ask: could anything else
be right here?

```json
{ "type": "choose", "nl": "Mijn collega ___ elke dag met de trein.",
  "options": ["reis", "reist", "reizen", "reizt"], "correct": 1,
  "en": "My colleague travels by train every day.", "note": "…" }
```
`choose`: one `___`, 3 or 4 options, `correct` is the index of the right one. Wrong options
are the mistakes learners really make (a wrong ending, the other article, the other
auxiliary); a misspelt form is allowed when it is the typical mistake. Use `"–"` (en dash)
as an option that means "nothing goes here". Vary where the right option stands.

```json
{ "type": "gap", "nl": "Zij ___ (sturen) een bericht naar de baas.", "answers": ["stuurt"],
  "en": "She sends a message to the boss.", "note": "…" }
```
`gap`: one `___`, typed. Give the word to be changed in brackets after the gap when the gap
asks for a form of it. `answers` lists every form that is right (usually one). The gap is
one continuous piece of text; for a form that is split over the sentence (`heb … gewerkt`,
`bel … op`) use `order` or `rewrite` instead.

```json
{ "type": "order", "lead": "Morgen", "words": ["we", "vergaderen", "om twee uur"],
  "answers": ["Morgen vergaderen we om twee uur."],
  "en": "Tomorrow we have a meeting at two o'clock.", "note": "…" }
```
`order`: she puts the pieces in the right order. `words` are the pieces (a piece may be
several words that belong together, like `om twee uur`; give 4 to 9 pieces); `lead`
(optional) is the piece the sentence must start with and is **not** repeated in `words`.
`answers` are the complete sentences, with capital letter and full stop or question mark;
the pieces of `lead` + `words` must make up each answer exactly. Dutch often allows more
than one order in the middle of a sentence: either list all of them in `answers`, or choose
pieces that leave only one. This is the kind for everything about word order.

```json
{ "type": "rewrite", "task": "Make it a question with jij.", "from": "Jij werkt vandaag thuis.",
  "answers": ["Werk jij vandaag thuis?", "Werk je vandaag thuis?"],
  "en": "Are you working from home today?", "note": "…" }
```
`rewrite`: a Dutch sentence (`from`) and an instruction in English (`task`) that leaves one
result: put it in the perfect, start with *Gisteren*, join the two with *omdat*, make it
passive, replace the noun by a pronoun. `answers` lists every correct result.

```json
{ "type": "fix", "wrong": "Mijn collega werk op vrijdag thuis.",
  "answers": ["Mijn collega werkt op vrijdag thuis."],
  "en": "My colleague works from home on Fridays.", "note": "…" }
```
`fix`: a sentence with **exactly one** mistake, of the kind this unit is about. She types
the whole sentence correctly. Everything else in the sentence must be right.

The mix: at least 3 `choose`, at least 3 `gap`, at least 1 `fix`, and `order` and `rewrite`
wherever the grammar point lends itself to them (word order: mostly `order`; tenses and
clauses: `rewrite`). At least four of the five kinds in every unit. Go from easy to hard,
and make sure the cases from "Watch out" are all practised.

## Before you hand it in

1. `node tools/path/validate.mjs --file tools/path/units/<id>.json` must say OK. Read its
   warnings too.
2. Read every Dutch sentence once more as a native speaker would: spelling (d/t, double
   vowels and consonants), `de/het`, word order, the auxiliary in the perfect.
3. Check each exercise against the one-right-answer rule.
4. Check that what the explanation says is true without exception, or that it names the
   exception.

Formatting: plain straight quotes `'` and `"`, no tabs, no trailing spaces, UTF-8. The file
is JSON, so a line break inside `explain` is written `\n`.
