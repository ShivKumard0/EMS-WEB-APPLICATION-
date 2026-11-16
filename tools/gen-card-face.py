import math, base64, io, sys
from PIL import Image
W, H = 1000, 630
# OpenDhi logo, white lettering for the dark card
im = Image.open(r'C:\Users\User Account\Desktop\RBL\ADT_Revamp-main\assets\Opendhilogo.png').convert('RGBA')
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if a and max(r, g, b) < 70:
            px[x, y] = (255, 255, 255, a)            # black lettering -> white
        elif a and abs(r - g) < 12 and abs(g - b) < 12 and 110 < r < 190:
            px[x, y] = (58, 170, 190, a)             # grey squares -> the card's teal
im = im.resize((822, round(822 * im.height / im.width)), Image.LANCZOS)
buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
logo = base64.b64encode(buf.getvalue()).decode()
LW = 274; LH = round(LW * im.height / im.width, 1)


# dotted ribbons: dots along flowing curves (round dashes of zero length)
def ribbon(n, f, sw, col, op):
    out = []
    for k in range(n):
        u = k / (n - 1)
        pts = []
        for i in range(0, 61):
            t = i / 60
            x, y = f(t, u)
            pts.append('%.1f %.1f' % (x, y))
        out.append('<path d="M' + ' L'.join(pts) + '" stroke="%s" stroke-opacity="%.2f" stroke-width="%.1f" stroke-dasharray="0 %.1f"/>'
                   % (col, op * (0.35 + 0.65 * math.sin(math.pi * u)), sw * (0.7 + 0.5 * math.sin(math.pi * u)), sw * 2.9))
    return ''.join(out)


def r1(t, u):   # from the left edge, sweeping down to the bottom right
    x = -20 + 1050 * t
    y = 215 + 150 * u + 250 * t ** 1.25 + (55 - 40 * u) * math.sin(2.6 * math.pi * t + 1.4 * u) * (0.35 + t)
    return x, y


def r2(t, u):   # the rings around the chip
    a = -0.5 + 2.3 * t
    rr = 95 + 215 * u
    return 150 + rr * math.cos(a) * 1.25, 215 + rr * math.sin(a) * 0.72 + 40 * t


def r3(t, u):   # top right corner
    x = 600 + 420 * t
    y = 40 + 190 * u + 60 * math.sin(2 * math.pi * t + 2 * u) - 70 * t
    return x, y


def r4(t, u):   # bottom right
    x = 780 + 240 * t
    y = 400 + 150 * u + 35 * math.sin(3 * math.pi * t + 3 * u)
    return x, y


dots = (ribbon(26, r1, 3.4, '#9a6bff', .62) + ribbon(14, r2, 3.2, '#a985ff', .50)
        + ribbon(12, r3, 2.6, '#b06cf0', .22) + ribbon(9, r4, 2.6, '#8f6cf0', .26))

chip = ('<g transform="translate(105 204)"><rect width="113" height="83" rx="13" fill="url(#gold)"/>'
        '<g fill="none" stroke="#8a6410" stroke-opacity=".55" stroke-width="1.6">'
        '<path d="M0 27H36M0 55H36M77 27H113M77 55H113M36 14V69M77 14V69M36 14Q36 1 50 1M77 14Q77 1 63 1M36 69Q36 82 50 82M77 69Q77 82 63 82M36 41H77M56 14V69"/></g>'
        '<rect x=".8" y=".8" width="111.4" height="81.4" rx="12.4" fill="none" stroke="#fff3c4" stroke-opacity=".55" stroke-width="1.2"/></g>')
nfc = ('<g transform="translate(743 246)"><path d="M0 -17 L27 0 L0 17Z" fill="#f58220"/><path d="M22 -17 L33 -17 L56 0 L33 17 L22 17 L45 0Z" fill="#17a84b"/></g>'
       '<g fill="none" stroke="#fff" stroke-width="6.2" stroke-linecap="round">'
       '<path d="M817 233a20 20 0 0 1 0 26"/><path d="M833 224a34 34 0 0 1 0 44"/><path d="M849 215a48 48 0 0 1 0 62"/><path d="M865 206a62 62 0 0 1 0 80"/></g>')
# RBL Bank: the mark (stem, cut, ring) and the name
rbl = ('<g transform="translate(662 38)" fill="#fff"><path d="M0 0H20V16L0 28Z"/><path d="M0 36L20 24V77H0Z"/>'
       '<path fill-rule="evenodd" d="M36 21a28 28 0 1 1 0 56a28 28 0 1 1 0 -56ZM36 38a11 11 0 1 0 0 22a11 11 0 1 0 0 -22Z"/></g>'
       '<text x="740" y="113" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="44" fill="#fff" textLength="212" lengthAdjust="spacingAndGlyphs">RBL BANK</text>')
rupay = ('<text x="903" y="536" text-anchor="end" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-style="italic" font-size="50" fill="#fff" textLength="150" lengthAdjust="spacingAndGlyphs">RuPay</text>'
         '<path d="M918 494 L932 494 L950 515 L928 538 L914 538 L936 515Z" fill="#17a84b"/>'
         '<path d="M902 494 L916 494 L934 515 L912 538 L898 538 L920 515Z" fill="#f58220"/>'
         '<text x="954" y="582" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-style="italic" font-size="29" letter-spacing="1.5" fill="#f1e9f5">PREPAID</text>')
svg = ('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 %d %d" width="%d" height="%d">' % (W, H, W, H)
       + '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#63147a"/><stop offset=".38" stop-color="#4a0f55"/><stop offset=".7" stop-color="#3a0c40"/><stop offset="1" stop-color="#3b1040"/></linearGradient>'
       + '<linearGradient id="streak" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8a3df0" stop-opacity="0"/><stop offset=".45" stop-color="#9a45ff" stop-opacity=".55"/><stop offset="1" stop-color="#8a3df0" stop-opacity="0"/></linearGradient>'
       + '<radialGradient id="glowR" cx=".95" cy=".05" r=".6"><stop offset="0" stop-color="#8b1fa8" stop-opacity=".55"/><stop offset="1" stop-color="#8b1fa8" stop-opacity="0"/></radialGradient>'
       + '<radialGradient id="shade" cx=".55" cy=".55" r=".75"><stop offset="0" stop-color="#2a0730" stop-opacity=".55"/><stop offset="1" stop-color="#2a0730" stop-opacity="0"/></radialGradient>'
       + '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f9eaa6"/><stop offset=".45" stop-color="#e2be57"/><stop offset=".75" stop-color="#f3da86"/><stop offset="1" stop-color="#c79a35"/></linearGradient>'
       + '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="26"/></filter>'
       + '<linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".55" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient>'
       + '<mask id="m"><rect width="%d" height="%d" fill="url(#fade)"/></mask></defs>' % (W, H)
       + '<rect width="%d" height="%d" fill="url(#bg)"/><rect width="%d" height="%d" fill="url(#glowR)"/>' % (W, H, W, H)
       + '<path d="M-40 250 L470 -30 L640 -30 L-40 330Z" fill="url(#streak)" filter="url(#soft)"/>'
       + '<rect width="%d" height="%d" fill="url(#shade)"/>' % (W, H)
       + '<g fill="none" stroke-linecap="round" mask="url(#m)">' + dots + '</g>'
       + '<image x="102" y="38" width="%s" height="%s" xlink:href="data:image/png;base64,%s"/>' % (LW, LH, logo)
       + rbl
       + '<text x="102" y="170" font-family="Segoe UI,Inter,Helvetica Neue,Arial,sans-serif" font-weight="400" font-size="41" fill="#fff">Multi<tspan dy="-13" font-size="27">+</tspan><tspan dy="13"> Corporate Card</tspan></text>'
       + chip + nfc + rupay
       + '<text transform="translate(63 566) rotate(-90)" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="16.5" letter-spacing=".6" fill="#efe6f3" fill-opacity=".92">FOR USE IN INDIA ONLY</text>'
       + '</svg>')
out = sys.argv[1] if len(sys.argv) > 1 else 'card-face.svg'
open(out, 'w', encoding='utf-8').write(svg)
print(len(svg), LW, LH)
open('cardtest.html', 'w', encoding='utf-8').write(
    '<body style="margin:0;background:#f6f7f9;padding:30px"><img src="card-face.svg" style="width:1180px;border-radius:56px;display:block"><br>'
    '<img src="card-face.svg" style="width:340px;border-radius:16px"></body>')
