# Verifying units: is everything shown as right really right?

A unit teaches by showing Dutch and by saying what is wrong. This pass checks one thing:
that **nothing in a unit teaches wrong Dutch**. It comes after writing and reviewing
(`spec.md`, `review.md`), and it is deliberately narrow.

The norm is standard Dutch as used in the Netherlands, as the ANS and Taaladvies describe
it. Belgian or informal forms may be accepted as answers; they are never the form that is
taught, and nothing the norm accepts may be presented as wrong.

Take the units one at a time. Read the whole file and check, string by string:

1. **Everything presented as correct Dutch**: the example lines of the explanation and its
   tables; the words with their `art`, `pl`, `past` and `perf`; every sentence `nl` and
   **every `alt`**; in every exercise the keyed option of a `choose` and **every string in
   `answers`**; the Dutch quoted in notes. Each must be correct standard Dutch on its own:
   spelling (d/t, double vowels and consonants, one word or two), de/het, plural, verb form,
   auxiliary, word order. Many `alt` and `answers` entries were added during an earlier
   review to avoid rejecting a correct sentence: read each of them as a sentence in its own
   right, and remove any that is not correct Dutch (a marked or unusual order may stay if it
   is grammatical).
2. **Everything presented as wrong**: the other options of a `choose`, the `wrong` sentence
   of a `fix`, and every form with an asterisk in the explanation or a note. Each must
   really be wrong in standard Dutch, in that sentence. If a "wrong" option is in fact
   acceptable, even if less usual, replace it by one that is truly wrong, or change the
   exercise so that the point is not tested.
3. **Every note**: the reason it gives must be true, and must be the real reason for the
   answer.
4. **Every `gap`**: the keyed answers fit, and no other common form fits the sentence as it
   is written (with its cue and its English).
5. **The English**: it must mean what the Dutch means.

Do not hunt for more alternative answers: that has been done. Add one only when you
notice a clearly correct, common answer that is rejected.

When you are not certain of a form or a rule, look it up instead of trusting memory:
woordenlijst.org (spelling, article, plural, verb forms), taaladvies.net, onzetaal.nl,
the e-ANS (e-ans.ivdnt.org). Use the web only for points you really doubt.

Repair by editing the unit's JSON with targeted edits (Read the file first; never rewrite
a whole file). Keep the shape and the counts. After editing a file run
`node tools/path/validate.mjs --file <path>`: it must print OK. Do not restyle, and do not
change id, level, icon, title, grammar or the theme of the words.

Report, and nothing else: per unit, each change in one line (what it was, what it is now,
why, and the source if you used one); then the doubts you did not act on; then, in one
line, the ids of the units that needed nothing.
