#  Computer Racing — Tiny Browser Game

**Lane racer** where literal **computers** race to a finish line.  
- **Up/Down**: change lane  
- **Space**: boost (drains battery; recharges over time)  
- **P**: pause  
- **R**: restart after finish

No libraries or build tools. Works on **GitHub Pages**.

## Run locally
Open `index.html` in a modern browser.

## Deploy on GitHub Pages
1. Create a new GitHub repo (e.g., `computer-racing`).
2. Upload these files to the repo root.
3. In the repo: **Settings → Pages → Build and deployment**  
   - Source: **Deploy from a branch**  
   - Branch: **main**; Folder: **/**  
4. Wait for Pages to publish. Your game will be live.

## Customize
- Change racer names and default colors in `game.js` where `racers` are created. Use the color picker in the UI to tweak your player color without editing code.
- Adjust `FINISH` distance or number of lanes.
- Add more features (boost/slow) by changing the sprinkling logic.

MIT licensed — have fun!
