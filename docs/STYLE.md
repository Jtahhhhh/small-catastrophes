# Style v1.0 (locked 2026-11-25)

- **Look:** gothic hand-drawn ink on aged paper; dark humour, never cute. Must not read as kids' content.
- **Ink:** variable width, tapered ends; thicker for main characters, thinner for far props.
- **Shading:** hatching only, never gradients on characters or props.
- **Boil:** lines redraw every 2 frames (12 fps) from 3 variants.
- **World:** paper cut-outs standing on a tilted ground plane; camera pushes and pans, no free 3D rotation.
- **Palette:** paper `#cfbf9c`, ink `#221c16`, coat `#4d5357`, red `#8a3a2c`, mustard `#b08532`, moss `#5f6a44`, wood `#7a5a3a`, bill `#8ea07a`.
  Red = bad / loss, moss = good / recovery.
- **Cast:** Mortimer Penny (narrator, cracked-lens logo), Mrs. Gristle (shopkeeper), Tally (crow, coin in beak).
- **Data:** every on-screen number sits on a cream card and has a source in the script.
- **Voice:** Kokoro `bm_george`, speed 0.95.
- **Never:** Don't Starve characters, names, fonts or assets; photoreal AI footage.
- **Size rule:** characters are never scaled by hand. Each set has a `depth(y)` rule: scale comes from where the feet touch the ground, so nearer = bigger. Street: a person at the shop door (y≈650) fits the door; Mortimer at the front (y≈985) fills ~65% of frame height. Only perched actors (Tally on the lamp) keep a fixed scale. Presenter next to a chart board stands at full height beside it.
- **Body spec (all adults):** height measured to the top of the head; legs 0.28·H, coat/body 0.40·H, neck 0.06·H, head 0.26·H (egg-shaped, width ≈ 0.77 of head height). Townsfolk H = 495–560, Mortimer 552 (tall and gaunt), Mrs. Gristle ≈ 445 (short, stout). Check any new character with `episodes/lineup` before using it.

## People and places (v0.4)

- Townsfolk use six muted skin tones (`SKINS` in `src/people.js`); each locale draws its own mix, so a crowd in Lagos or
  Delhi looks like it belongs there. Eyes have small whites so they read on every tone.
- A scene set abroad changes signs, currency symbol, sky and crowd, not just the stamp.
- Hands: Mortimer carries his ledger at his side in the back hand; the front hand is free for pointing. Mrs. Gristle has
  two separate arms.
