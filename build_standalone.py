#!/usr/bin/env python3
"""Produce a single-file offline HTML with the same CSS, JS and audio as the ZIP."""
from pathlib import Path
from base64 import b64encode
here=Path(__file__).resolve().parent
html=(here/'index.html').read_text(encoding='utf-8')
css=(here/'styles.css').read_text(encoding='utf-8')
js=(here/'app.js').read_text(encoding='utf-8')
config=(here/'config.js').read_text(encoding='utf-8')
audio=b64encode((here/'assets/neon_live_mix.mp3').read_bytes()).decode('ascii')
assert '</style' not in css.lower() and '</script' not in js.lower() and '</script' not in config.lower()
html=html.replace('<link rel="stylesheet" href="styles.css">',f'<style>\n{css}\n</style>',1)
html=html.replace('<script src="config.js"></script>',f'<script>\n{config}\n</script>',1)
html=html.replace('<script src="app.js"></script>',f'<script>\n{js}\n</script>',1)
html=html.replace('src="assets/neon_live_mix.mp3"',f'src="data:audio/mpeg;base64,{audio}"',1)
assert 'src="app.js"' not in html and 'href="styles.css"' not in html
out=here.parent/'NEON_PARTY_LIVE_STANDALONE.html'
out.write_text(html,encoding='utf-8')
print(f'Saved {out} ({out.stat().st_size/1e6:.1f} MB).')
