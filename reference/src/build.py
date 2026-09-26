import base64, subprocess, os, sys
os.chdir('/home/claude')
G = 'vendor/gfonts/ofl/'
os.makedirs('build/fonts', exist_ok=True)
latin = 'U+0020-007E,U+00A0-017F,U+1E00-1EFF,U+2010-2044,U+2070-209F,U+20B9,U+2190-2193,U+2212,U+2715,U+00B0,U+2032,U+2033,U+2153,U+00B7,U+2026,U+25CC'
specs = [
  ('TiroSkt', 'normal', 400, G+'tirodevanagarisanskrit/TiroDevanagariSanskrit-Regular.ttf', latin+',U+0900-097F,U+A8E0-A8FF,U+1CD0-1CFF,U+200C,U+200D'),
  ('TiroSkt', 'italic', 400, G+'tirodevanagarisanskrit/TiroDevanagariSanskrit-Italic.ttf', latin),
  ('TiroTa', 'normal', 400, G+'tirotamil/TiroTamil-Regular.ttf', latin+',U+0B80-0BFF,U+200C,U+200D'),
  ('NotoS', 'normal', 400, G+'notosans/NotoSans[wdth,wght].ttf', latin),
  ('Plex', 'normal', 400, G+'ibmplexmono/IBMPlexMono-Regular.ttf', latin),
  ('Plex', 'normal', 600, G+'ibmplexmono/IBMPlexMono-SemiBold.ttf', latin),
]
css = []
for i, (fam, style, wt, src, uni) in enumerate(specs):
    out = f'build/fonts/{fam}-{style}-{wt}.woff'
    if fam == 'NotoS':
        inst = 'build/fonts/notos-inst.ttf'
        if not os.path.exists(inst):
            subprocess.run([sys.executable, '-m', 'fontTools.varLib.instancer', src, 'wdth=100', 'wght=400:700', '-o', inst], check=True, capture_output=True)
        src = inst
    if not os.path.exists(out):
        subprocess.run(['pyftsubset', src, f'--unicodes={uni}', '--layout-features=*', '--flavor=woff', f'--output-file={out}'], check=True)
    b = base64.b64encode(open(out, 'rb').read()).decode()
    wdecl = '400 700' if fam == 'NotoS' else str(wt)
    css.append(f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:{wdecl};font-display:block;src:url(data:font/woff;base64,{b}) format('woff')}}")
    print(fam, style, wt, os.path.getsize(out))
tpl = open('src/template.html').read()
engine = open('panchanga.js').read()
film = '\n'.join(open(f'src/{f}').read() for f in ['core.js', 'chapters1.js', 'chapters2.js', 'app.js'])
html = tpl.replace('/*FONTS*/', '\n'.join(css)).replace('/*ENGINE*/', engine).replace('/*FILM*/', film)
open('build/panchangam.html', 'w').write(html)
print('size', len(html))
