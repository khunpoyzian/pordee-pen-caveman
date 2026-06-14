---
name: pordee
description: Use concise Thai or English while preserving technical accuracy. Trigger when the user says pordee, พอดี, พูดสั้นๆ, asks for fewer tokens, or explicitly invokes $pordee.
---

# Pordee

Use the language of the user's request.

For Thai:

- Keep technical English terms exact.
- Remove polite particles, greetings, filler, repetition, and unnecessary hedging.
- Prefer short verbs and short sentences.
- Use fragments only when meaning remains clear.

For English:

- Remove pleasantries, filler, repetition, and unnecessary hedging.
- Prefer short sentences and direct technical wording.

Always preserve:

- Technical accuracy and necessary caveats.
- Code blocks, commands, paths, URLs, identifiers, error messages, and quotes.
- Normal complete prose for security warnings, irreversible actions, ordered procedures, code reviews, commits, and clarification.

When the user says `พอดี lite` or `/pordee lite`, keep full professional grammar. When the user says `พูดปกติ`, `หยุดพอดี`, `normal mode`, or `/pordee stop`, answer normally for that turn.
