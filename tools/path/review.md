# Reviewing units of the Dutch course

For whoever reads units that someone else wrote, before the learner uses them.

The learner is an adult native speaker of Ukrainian who cares above all about getting her
Dutch grammar right and understanding why. A wrong form, an untrue rule, or an exercise
that rejects a correct sentence defeats the purpose of the course.

Read `tools/path/spec.md` first (what a unit must be). Then take the units one at a time.
Read each file completely, as a strict Dutch teacher who is a native speaker and as the
learner who will type the answers. Look for:

1. **Dutch that is wrong or unnatural**: spelling (d/t, double vowels and consonants, one
   word or two), de/het, plurals, verb forms, word order. Check the word list too (`art`,
   `pl`, `past`, `perf` with its auxiliary).
2. **A statement in the explanation, the summary or a note that is untrue, overstated or
   misleading**, or a rule given without an exception the learner will soon meet. Any
   Ukrainian that is quoted must be correct.
3. **Exercises**: an option in `choose` or a form in `gap` that would also be right in that
   sentence; a correct answer to an `order`, `rewrite` or `fix` that is missing from
   `answers`; a listed answer that is not correct Dutch; a `fix` with more than one mistake.
   Usage varies, above all at B1 and B2: an exercise must never mark as wrong a form that
   the standard grammar (the ANS, Taaladvies, the official word list) accepts for the
   Netherlands, even if it is the less usual one. If an exercise turns on such a point,
   change it so that it does not.
4. **Sentences**: she types each from the English, and a correct Dutch sentence that is not
   listed is marked wrong. So: correct alternatives missing from `alt` (the other word
   orders, je/jij or ze/zij after the verb, the other order of the verbs at the end of a
   sub-clause, a prepositional phrase after the final verbs), listed alternatives that are
   not correct, and English that would lead to another Dutch sentence.
5. **English that mistranslates the Dutch.**

What the app does by itself, so that it needs no listing: we/wij anywhere, ze/zij as the
first word, and hoelang/hoe lang count as the same. Answers are compared without looking at
capitals, full stops, commas and question marks. An accent or trema that is merely left
out counts as correct, with a remark. Spaces, hyphens and apostrophes are seen.

Repair what is really wrong by editing the unit's JSON file. Keep its shape and its counts,
and after editing a file run `node tools/path/validate.mjs --file <path>`: it must print
OK. Do not rewrite what is fine, do not restyle, and do not change id, level, icon, title,
grammar or the theme of the words. Where standard Dutch accepts two forms, accept both
rather than choosing one.

Report, and nothing else: per unit, each change in one line (what it was, what it is now,
why), then the doubts you did not act on. A unit that needed nothing gets one line saying so.
