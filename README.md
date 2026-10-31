# School D’Or v3: the Ceremony

Voters go through a cinematic ceremony: every time, the School D’Or story plays first. Each award then opens with dramatic animated text, sound effects, music and your friend’s voice, the trophy appears, the nominees arrive one by one with their stats, and then they vote. A locked vote moves straight on to the next award.

```
public/index.html, admin/index.html   the website and the /admin page
public/style.css, app.js              look and behaviour (voters)
public/admin.js                       the admin dashboard and voice studio
public/audio.js                       sound effects, built-in score, voice mixing and recording
public/scenes.js                      the text animations, trophy reveal and nominee reveal
public/ball.jpg                       the trophy image
functions/api/[[path]].js             the backend
schema.sql                            full database setup (new installs only)
migration-v3.sql                      run this once on your existing database
```

## Updating (about 10 minutes)

1. **Database first.** Cloudflare → Storage & Databases → D1 → your database → **Console**. Paste all of `migration-v3.sql` and press **Execute**. It only **adds new tables**. Your players, awards, photos and votes are untouched. Safe to run again.
2. **GitHub.** Upload the files, keeping the same folders. Files that exist are replaced.
   - `public/`: `index.html`, `style.css`, `app.js`, `audio.js`, `scenes.js`, and the new **`admin.js`**
   - `public/admin/`: `index.html`
   - `functions/api/`: `[[path]].js`
3. Wait a minute for Cloudflare to redeploy, then hard refresh.

## What voters see
- **Awards page:** a secret until the ceremony (no names, no count). After you reveal results it shows the winners.
- **Voting:** one button, **Start voting** (or **Continue voting** if they already voted). No award list, count or menu. The only way out is **Leave**.
- **Every time** (even after a refresh): the School D’Or story first, then the awards in your order. “Continue voting” skips straight to their first unvoted award after the story.
- Each vote asks **“Lock in your vote?”**. After confirming it moves to the next award automatically. At the end they see a summary where they can change any vote until voting closes.
- Skip buttons stay inside the animations, so people can skip a voice-over or the nominees.

## Admin (`/admin`), five tabs
- **Ceremony:** the show order with ▲ ▼. Preview any part or the whole ceremony.
- **Awards:** add awards, pictures, nominees, **Reset votes** for one award. To make a typed-name trophy, set its Type to **Write-in**. The smart name matching (capitals, spelling, merging) is in the Voting tab.
- **Voice studio:** pick an item (Opening, an award, Thank-you). See below.
- **Players:** names, stats, photos.
- **Voting:** reveal results, deadline, voting code, live results, **Reset ALL votes**.

## Voice studio (your friend’s voiceover)
Every item is a list of **lines**. Each line has its text, an animation style, the time it appears, and optionally a voice clip.
1. Open **Voice studio**, choose an item, tap **Customise this timeline** (this creates editable lines from the built-in wording). Edit the wording as you like.
2. **Record:** press **🎙 Record** on a line (or **Record all lines** to be guided through every line one after another). The line is shown big on screen to read. You can listen, keep or try again. Silence at the start and end is trimmed automatically. You can do a few lines now and the rest later.
   - Or **Upload file** if he recorded in another app.
3. **Place it:** drag the blue/green blocks on the timeline, or type the “Voice starts at” time. The voice can start at a different time than its text.
4. **Trim and speed:** drag the gold handles on the waveform to cut the clip. Choose a speed (0.8× to 1.4×). Speeding up also raises the pitch a little, so small changes sound best. Volume has four settings.
5. **Preview** plays the real thing. The trophy appears after the last line and voice clip finish.
6. **Recording sheet** prints a list of every line for him to read.
The recorder needs microphone permission (allowed on your https site). If someone else records on their phone, they need the admin password, or they can send files for you to upload.

## Good to know
- Default timing: each award intro is about 15 seconds and the nominee reveal about 12 seconds. The opening story is about 21 seconds. Both depend on how many lines and nominees you have.
- Sound starts after a tap (browser rule), has a mute button, and a phone on silent may mute it. Visitors with “reduce motion” turned on skip the animations.
- Voice clips are stored as small WAV files (a 15 second clip is about 700 KB). Each upload is limited to about 1.3 MB. Music uploads are limited the same way, so trim tracks to 30 to 60 seconds. Only use music you have permission to use.
- The awards are hidden from the screen, but a technical person can still find them in the site’s data. It is a surprise, not a security feature.
- Votes: one ballot per device per award. The voting code and rate limit still apply.

## Troubleshooting
- Can’t save lines, voice or award type: run `migration-v3.sql` (step 1).
- No sound: tap the page first, check the 🔊 button and the phone’s silent switch.
- Looks unchanged: hard refresh and make sure `admin.js` was uploaded.
