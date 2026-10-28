# School D’Or: Lunchtime Football Awards

A dark, gold-themed voting site with an admin panel. It runs on Cloudflare's free tier, so it **stays online all the time** (no "goes to sleep when nobody visits" like Render's free plan).

```
public/index.html        the website
public/ball.jpg          the golden trophy image
functions/api/[[path]].js  the backend (votes, admin, photos)
schema.sql               sets up the database (and adds the starter players/awards)
```

## What you need
- A free GitHub account: https://github.com
- A free Cloudflare account: https://dash.cloudflare.com/sign-up (no card needed for what we use)

---

## Part 1: Put the code on GitHub

1. Unzip `school-dor-site.zip` on your computer. You will see `public`, `functions`, `schema.sql` and `README.md`.
2. On GitHub, click **+** (top right) → **New repository**. Name it `school-dor`, leave it **Public** or choose **Private** (both work), and click **Create repository**.
3. On the new repo page click **uploading an existing file**.
4. Open the unzipped folder and **drag everything inside it** (the `public` and `functions` folders plus the two files) into the browser. Wait for the upload to finish.
5. Scroll down and click **Commit changes**.

Check that you can see `public`, `functions`, `schema.sql` in your repo.

## Part 2: Put it live on Cloudflare Pages

1. In Cloudflare go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Connect your GitHub account and pick the `school-dor` repo → **Begin setup**.
3. Settings:
   - Framework preset: **None**
   - Build command: *leave empty*
   - Build output directory: **public**
4. Click **Save and Deploy**. When it finishes you get a link like `https://school-dor.pages.dev`. It will not fully work yet. Do Part 3 and 4 next.

## Part 3: Create the database

1. In Cloudflare go to **Storage & Databases** → **D1 SQL Database** → **Create database**. Name it `school-dor-db`.
2. Open the database → **Console** tab.
3. Open `schema.sql` from your unzipped folder, copy **all** of it, paste into the console, and click **Execute**.

## Part 4: Connect the database and set your admin password

1. Go to **Workers & Pages** → your `school-dor` project → **Settings**.
2. **Bindings** → **Add** → **D1 database**:
   - Variable name: `DB` (exactly, capital letters)
   - Database: `school-dor-db`
   - Save.
3. **Variables and Secrets** → **Add**:
   - Variable name: `ADMIN_PASSWORD`
   - Value: a strong password only you know (type: Secret)
   - Save.
4. Go to **Deployments** → on the latest one click **⋯** → **Retry deployment**, so the new settings take effect.

## Part 5: Use it

1. Open your `.pages.dev` link. The intro plays, then the site loads.
2. Click **Login** (top right) and enter your `ADMIN_PASSWORD`. An **Admin** tab appears.
3. In **Admin** you can:
   - add, rename and delete awards, choose an icon and upload an award picture
   - add players, edit position/goals/assists/rating and upload their photos
   - choose which players are nominated in each award
   - set a voting deadline (with live countdown), reveal results, and set an optional **voting code**
4. Share the link with your group. Nobody needs an account to vote.

To let another person be an admin, give them the admin password. To remove their access, change `ADMIN_PASSWORD` in Cloudflare and retry the deployment.

### Custom address (optional)
Project → **Custom domains** → **Set up a custom domain** (you need to own a domain).

### Updating the site later
Edit a file on GitHub (pencil icon) and commit. Cloudflare redeploys automatically within a minute.

---

## How the anti-spam works
- **One ballot per device.** The first time someone votes, their browser gets a private device ID. Each device gets one vote per award. They can change their pick until voting closes, but they cannot add extra votes.
- **Rate limit.** One internet connection can only send a limited number of votes per minute, which stops scripts.
- **Optional voting code.** In Admin set a code (for example one you announce at school). Only people who know it can vote. This is the strongest protection.
- **Honest limit:** a determined person could clear their browser data or use a private window to get a fresh device ID. The voting code is the fix for that. You can also check the voter count in Admin against how many people you expect.

## Free plan limits
Cloudflare's free plan allows plenty for a school site, but limits can change, so check their pricing page if usage grows. Open pages refresh their data every 15 seconds, and only while the tab is visible.

## Troubleshooting
- **Site loads but shows no awards:** the database is not connected. Re-check Part 3 (ran `schema.sql`) and Part 4 (binding named exactly `DB`), then retry the deployment.
- **Login says wrong password:** check `ADMIN_PASSWORD` has no extra spaces, and retry the deployment after changing it.
- **Photo upload fails:** use a normal JPG/PNG photo. Very large images are shrunk automatically, but the upload limit is about 1 MB after shrinking.
