# 🏐 VolleyBall Team Management (VTM)

🇬🇧 English · [🇫🇷 Français](README.fr.md)

VTM is a lightweight web app to manage volleyball players and build **balanced, well-mixed teams** across one or more courts. It runs in any modern browser on desktop and smartphone, needs no server or account, and stores its data in a portable **XML file** that you can share between devices.

## Features

- **Courts tab**: add or remove courts, shown as classic orange courts with white lines (one team on top, one at the bottom). Players appear as photo thumbnails with their name, placed according to their preferred positions.
  - **Balanced random**: shuffles the available players and balances the teams on every criterion (and on positions), so matches stay varied *and* fair.
  - **Strongest → weakest** (toggle: weakest → strongest): groups the best players together and makes the strongest teams play each other, starting on court 1.
  - Tap one player, then another (or a player from the "unplaced" list) to swap them manually.
- **Players tab**: add, edit, delete or deactivate players. Each player has a photo, a name, sliders from 0 to 10 and preferred positions.
  - Always available criteria: **Strength, Speed, Agility** (you can add your own in the settings).
  - Positions: **Setter, Hitter, Middle, Tech**. None selected = can play any position.
- **Import / export** of the whole configuration as XML.
- **Multilingual**: English and French built in, and you can add your own language from the app (see [Languages](#languages)).
- **Installable** on a smartphone (PWA) and usable offline.

## Run it

No build step and no dependency. Either:

- open `index.html` in a browser, or
- serve the folder (needed for smartphone install / offline mode):

```bash
python -m http.server 8080
# then open http://localhost:8080
```

To try it on a phone on the same Wi-Fi, open `http://<your-PC-IP>:8080` in the phone browser (allow Python through the Windows firewall if asked).

## How to use

1. **First launch**: choose *Import a configuration* (XML file) or *Create a new configuration*.
2. **Players tab**: tap **+** (top right) to add a player. Set a photo, a name, the sliders and the preferred positions. Tap a player card to edit, deactivate or delete them. Deactivated players are ignored when teams are generated.
3. **Courts tab**: use **−** / **+** to set the number of courts, then press **Balanced random** or **Strongest → weakest**. On a phone, swipe left/right to move between courts.
4. **Settings (⚙)**: number of players per team (1–6, default 6), custom criteria, import/export.

If there are more active players than places, the extra players are listed as *unplaced* and get priority next time. If there are too few, the number of teams is reduced (always an even number).

## Languages

All user-visible texts are stored in `resources.js`, each one identified by an **English key** (e.g. `btn.random`, `toast.generated`). English is the reference language and the fallback when a translation is missing. The code only ever calls `t('key')`; no text is hard-coded in the app logic. Icons/emojis are **not** part of the translated texts: they are declared once in the `ICONS` table of `app.js` and always displayed next to the text (including on the translation page), so translators never have to type or keep them.

**Switch language**: click the 🌐 icon next to the settings icon (⚙) and pick **FR**, **EN** or any language you added. The choice is remembered.

**Add a language from the app**:
1. Click 🌐 → **Add a language**. This opens the translation page.
2. Choose the **source language** (any language already available).
3. Enter the **code** (2–8 letters, e.g. `es`) and the **name** (e.g. `Español`) of the new language.
4. Every text is listed on the left in the source language, with a text box on the right for the translation. Between the two, the **➜** button copies the source text into the box (handy when the original wording can be kept). Keep placeholders such as `{n}` unchanged.
5. Click **Save language**: any box left empty is filled with the source text, and the app switches to the new language immediately.

**Edit a language**: click the ✎ icon next to a language in the 🌐 menu. The translation page opens with the current texts preloaded (shown against English), so you can fix or reword any of them. This works for your own languages as well as for FR and EN: changes to the built-in ones are saved as overrides in your browser and do not modify `resources.js`.

Custom languages and edits are stored in the browser (local storage) of the device where they were created; they are not part of the XML configuration.

**Add a language permanently (for developers)**: copy the `en` block in `resources.js`, rename it with the new language code, set `_name`, and translate the values. Keys must stay unchanged.

## Import / export

Data is saved automatically in the browser (local storage). To back up or move to another device:

- **Export**: ⚙ → *Export configuration (XML)* → a file `vtm-config.xml` is downloaded (players, photos, criteria, courts and current teams).
- **Import**: ⚙ → *Import a configuration (XML)* → select the file. The current configuration is replaced. The same choice is offered at first launch when nothing is loaded.
- To share with another device, send the file (email, messaging app, cloud drive) and import it there.

## Install on a smartphone

The site must be served over **HTTPS** (e.g. GitHub Pages, Netlify, Cloudflare Pages) for installation and offline mode to work.

- **Android (Chrome)**: open the site → menu ⋮ → **Install app** (or *Add to Home screen*).
- **iPhone / iPad (Safari)**: open the site → **Share** button → **Add to Home Screen**.

The app then opens full screen with its own icon and works offline. Remember that each device keeps its own data: use export/import to synchronize.

### Publish with GitHub Pages

1. Push the repository to GitHub.
2. *Settings → Pages* → Source: *Deploy from a branch* → select your branch and the `/ (root)` folder.
3. After a minute the site is available at `https://<user>.github.io/<repository>/`.

## Project structure

| File | Role |
|------|------|
| `index.html` | Page structure |
| `style.css` | Styles (responsive, mobile first) |
| `app.js` | Logic: data, team generation, rendering, XML import/export, language handling |
| `resources.js` | Language resources (FR, EN): all texts, keyed in English |
| `manifest.webmanifest`, `icon.svg`, `sw.js` | PWA install and offline support |

## Tech

Plain HTML, CSS and JavaScript: no framework, no build tooling.
