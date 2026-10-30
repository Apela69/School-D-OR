# School D’Or v2: Ceremony Edition

A dark, gold-themed awards site that runs on Cloudflare (free tier, always on). Visitors vote through a cinematic ceremony: each award gets its own animation, voiceover and sound, then a vote with a confirm step, then **Next**.

```
public/index.html, admin/index.html   the website and the /admin sign-in page
public/style.css, app.js              look and behaviour
public/audio.js                       sound effects + built-in score (made in code) + voice/music mixing
public/scenes.js                      the 8 award animations
public/ball.jpg                       the trophy image
functions/api/[[path]].js             the backend (votes, write-ins, admin, photos, audio)
schema.sql                            full database setup (new installs)
migration-v2.sql                      adds the NEW tables to an existing database
```

## Updating your existing site (about 5 minutes)

**1. Upload to GitHub.** Open your `school-dor` repo → **Add file → Upload files**. Unzip this package and drag in everything (keep the folders). Commit. Cloudflare redeploys by itself.

**2. Add the new tables.** Cloudflare → **Storage & Databases → D1 → your database → Console**. Paste all of `migration-v2.sql` and press **Execute**.
- It only **adds four new tables** (`award_meta`, `audio`, `writeins`, `aliases`). Your players, awards, photos and votes are not touched.
- It is safe to run more than once.
- Until you run it, the old features keep working, but voice, music, write-in awards and award ordering cannot be saved.

**3. Refresh.** Open your site and do a hard refresh (Ctrl+Shift+R, or close and reopen the tab on a phone).

Fresh install? Follow the old steps but paste `schema.sql` (it already includes the new tables).

## Setting up the ceremony (in Admin: `/admin`)

1. **Order:** Awards play from the top of the list down, so put the least important first and the biggest last (School D’Or second to last, People’s Choice last). Use the ▲ ▼ buttons.
2. **People’s Choice (typed names):** Add an award, then set **Type: Write-in**. Voters type a name instead of picking. Only you can see the counts, shown under that award as *Live name counts*.
   - Names are matched ignoring capitals, spaces and accents, and close spellings are merged (“romit”, “Romitt”, “Romit Sharma” → Romit). Names that match a player are tied to that player.
   - It cannot be perfect (nicknames, similar names), so you can **Merge** two entries or **Hide** a rude one. Hidden entries can be brought back.
3. **Animation:** each award has an *Animation* style (Auto picks one from the award name) and a *Length* in seconds (12 to 45). Use **▶ Preview animation** to watch it.
4. **Award picture:** upload your ChatGPT image. It is shown in full with no text on top, so the text already in your image is never covered.
5. **Voiceover:** open **📝 Recording sheet for your friend**. It lists every line, the tone, the time it comes in and how long each clip should be. Print it or save as PDF. He records one clip per line (phone voice memo is fine), then you press **Upload recording** on the matching award. Lines can be edited in the text box first.
6. **Music (optional):** upload a track per award, or leave it empty and the built-in cinematic score plays. Fill in the title, artist and link, and they appear automatically as “Music:” credits in the site footer.
7. **Opening movie and thank-you:** the *Opening & thank-you* section controls the “▶ Watch the story” animation and the screen after the last award.

## Good to know

- **File size:** each audio upload can be up to about 1.3 MB (roughly 80 seconds of ordinary MP3). Voice clips of 15 to 20 seconds are tiny. For music, trim to 30 to 60 seconds. It loops.
- **Sound starts after a tap** (browsers block automatic sound). Voters can mute with the 🔊 button. A phone on silent may mute web sound.
- **No recording yet?** That animation plays with sound effects, music and on-screen captions. You can also turn on **Browser voice** in Admin, though it sounds robotic and differs per device.
- **Reduced motion:** visitors with that accessibility setting skip the animations and go straight to voting.
- **Music licences:** only use music you have permission to use, and add the credit if the licence asks. Avoid famous songs and football anthems.
- **Votes:** one ballot per device per award. Voters confirm before locking in, and can change their pick until voting closes. The optional voting code and per-connection rate limit still apply.
- **Admin:** only at `/admin`, protected by `ADMIN_PASSWORD` on the server. There is a small “Admin” button in the menu that leads there, but hiding it is not the protection; the password is.

## Troubleshooting
- **Saving voice, music or award type fails:** run `migration-v2.sql` (step 2).
- **Upload says “too big”:** trim or lower the quality of the audio.
- **Looks unchanged after the update:** hard refresh; check the latest deployment finished in Cloudflare.
