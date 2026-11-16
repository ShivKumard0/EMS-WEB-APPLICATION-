import math, random, sys
W, H = 1000, 630
F = 'font-family="Arial,Helvetica,sans-serif"'


def ribbon(n, f, sw, col, op):
    out = []
    for k in range(n):
        u = k / (n - 1)
        pts = ['%.1f %.1f' % f(i / 60, u) for i in range(61)]
        out.append('<path d="M' + ' L'.join(pts) + '" stroke="%s" stroke-opacity="%.2f" stroke-width="%.1f" stroke-dasharray="0 %.1f"/>'
                   % (col, op * (0.35 + 0.65 * math.sin(math.pi * u)), sw * (0.7 + 0.5 * math.sin(math.pi * u)), sw * 2.9))
    return ''.join(out)


def r1(t, u):   # rings from the middle towards the bottom right
    a = 0.2 + 2.2 * t
    rr = 120 + 300 * u
    return 760 - rr * math.cos(a) * 1.15, 250 + rr * math.sin(a) * 0.62


def r2(t, u):   # top right corner
    return 640 + 380 * t, 150 + 120 * u + 40 * math.sin(2.4 * math.pi * t + 2 * u) + 60 * t


dots = ribbon(18, r1, 3.0, '#9a6bff', .36) + ribbon(10, r2, 2.6, '#b06cf0', .24)

# a QR-style block (three finder squares and a module pattern); not a working code
random.seed(422)
N = 25; q0x, q0y, qs = 760, 377, 152; pad = 9; m = (qs - 2 * pad) / N


def finder(cx, cy):
    return (cx <= 6 and cy <= 6) or (cx >= N - 7 and cy <= 6) or (cx <= 6 and cy >= N - 7)


def fin(cx, cy, ox, oy):
    x, y = cx - ox, cy - oy
    return (x in (0, 6) or y in (0, 6) or (2 <= x <= 4 and 2 <= y <= 4)) and 0 <= x <= 6 and 0 <= y <= 6


mods = []
for cy in range(N):
    for cx in range(N):
        on = False
        if finder(cx, cy):
            on = fin(cx, cy, 0, 0) or fin(cx, cy, N - 7, 0) or fin(cx, cy, 0, N - 7)
        elif (cx == 7 and cy <= 7) or (cy == 7 and cx <= 7) or (cx == N - 8 and cy <= 7) or (cy == 7 and cx >= N - 8) or (cx == 7 and cy >= N - 8) or (cy == N - 8 and cx <= 7):
            on = False
        elif cx == 6 or cy == 6:
            on = (cx + cy) % 2 == 0
        elif N - 9 <= cx <= N - 5 and N - 9 <= cy <= N - 5:
            x, y = cx - (N - 9), cy - (N - 9)
            on = x in (0, 4) or y in (0, 4) or (x == 2 and y == 2)
        else:
            on = random.random() < 0.48
        if on:
            mods.append('M%.2f %.2fh%.2fv%.2fh-%.2fz' % (q0x + pad + cx * m, q0y + pad + cy * m, m + .05, m + .05, m + .05))
qr = ('<rect x="%d" y="%d" width="%d" height="%d" rx="9" fill="#fff"/><path d="%s" fill="#111"/>' % (q0x, q0y, qs, qs, ''.join(mods)))

holo = ('<g transform="translate(27 205)"><rect width="201" height="138" rx="13" fill="url(#silver)"/>'
        '<rect x=".7" y=".7" width="199.6" height="136.6" rx="12.4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>'
        '<g stroke-linejoin="round" stroke-linecap="round" fill="none">'
        '<path d="M30 22 L102 69 L30 116 Z" stroke="#f04a23" stroke-width="13"/><path d="M30 22 L102 69 L30 116 Z" stroke="#f7b500" stroke-width="9"/>'
        '<path d="M36 33 L91 69 L36 105 Z" stroke="#8cc63f" stroke-width="7"/><path d="M45 47 L78 69 L45 91 Z" stroke="#17a84b" stroke-width="6" fill="#39a9dc"/>'
        '<path d="M100 22 L172 69 L100 116" stroke="#f04a23" stroke-width="13"/><path d="M100 22 L172 69 L100 116" stroke="#f7b500" stroke-width="9"/>'
        '<path d="M98 20 L172 69 L98 118" stroke="#8cc63f" stroke-width="4" transform="translate(-9 0)"/>'
        '</g></g>')

# six small service signs in a framed box
ic = 'fill="none" stroke="#e9dcf2" stroke-opacity=".8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'
icons = ('<g transform="translate(809 170)" ' + ic + '><rect width="157" height="90" rx="9" stroke-opacity=".55"/><path d="M12 45H145" stroke-opacity=".55"/>'
         # bus
         '<g transform="translate(18 9)"><rect x="0" y="2" width="30" height="22" rx="4"/><path d="M0 14H30M4 2V-1H26V2M6 24v4M24 24v4"/><circle cx="7" cy="19" r="1.3"/><circle cx="23" cy="19" r="1.3"/></g>'
         # train
         '<g transform="translate(66 8)"><rect x="2" y="0" width="22" height="24" rx="5"/><path d="M2 13H24M8 24l-4 5M18 24l4 5M9 5h8"/><circle cx="8" cy="18.5" r="1.3"/><circle cx="18" cy="18.5" r="1.3"/></g>'
         # ticket machine
         '<g transform="translate(112 8)"><rect x="0" y="0" width="24" height="24" rx="3"/><rect x="5" y="4" width="14" height="8"/><path d="M7 17h10M12 24v5M6 29h12"/></g>'
         # cup
         '<g transform="translate(20 54)"><path d="M0 3H22V20a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5ZM22 8h4a4 4 0 0 1 0 8h-4"/></g>'
         # bag
         '<g transform="translate(66 54)"><path d="M0 8H26V26H0ZM7 8V5a6 6 0 0 1 12 0V8"/></g>'
         # fuel
         '<g transform="translate(113 52)"><rect x="0" y="2" width="15" height="26" rx="2"/><path d="M3 7h9v7H3ZM15 10l6 5v10a2.5 2.5 0 0 0 5 0V12l-4-4"/></g>'
         '</g>')

rbl = ('<g transform="translate(751 239) scale(.755)" fill="#fff"><path d="M0 0H20V16L0 28Z"/><path d="M0 36L20 24V77H0Z"/>'
       '<path fill-rule="evenodd" d="M36 21a28 28 0 1 1 0 56a28 28 0 1 1 0 -56ZM36 38a11 11 0 1 0 0 22a11 11 0 1 0 0 -22Z"/></g>'
       '<text x="809" y="296" ' + F + ' font-weight="700" font-size="33" fill="#fff" textLength="156" lengthAdjust="spacingAndGlyphs">RBL BANK</text>'
       '<text x="965" y="321" text-anchor="end" font-family="Georgia,Times New Roman,serif" font-style="italic" font-weight="700" font-size="15" fill="#f1e9f5">apno ka bank</text>')

para = ['This card is property of RBL Bank Limited. The use of this prepaid card is',
        "subject to Terms &amp; Conditions governing RBL Bank Limited's card usage,",
        'which may be amended from time to time. If found, please return to the',
        'nearest RBL Bank Limited branch or to RBL Bank Limited, National',
        'Operation Centre, 9th Floor, Techniplex - I, Off Veer Savarkar flyover,',
        'Goregaon (West), Mumbai - 400 062.']
ys = [428, 447, 466, 485, 504, 523]
ptxt = ''.join('<text x="31" y="%d" %s font-size="15.4" fill="#f4eef7"%s>%s</text>'
               % (ys[i], F, '' if i == len(para) - 1 else ' textLength="593" lengthAdjust="spacing"', para[i]) for i in range(len(para)))

svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">' % (W, H, W, H)
       + '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a1370"/><stop offset=".4" stop-color="#450e50"/><stop offset=".75" stop-color="#3a0c40"/><stop offset="1" stop-color="#3b1040"/></linearGradient>'
       + '<radialGradient id="glowR" cx=".98" cy=".3" r=".55"><stop offset="0" stop-color="#8b1fa8" stop-opacity=".5"/><stop offset="1" stop-color="#8b1fa8" stop-opacity="0"/></radialGradient>'
       + '<linearGradient id="streak" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8a3df0" stop-opacity="0"/><stop offset=".5" stop-color="#9a45ff" stop-opacity=".45"/><stop offset="1" stop-color="#8a3df0" stop-opacity="0"/></linearGradient>'
       + '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter>'
       + '<linearGradient id="silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f5f6"/><stop offset=".35" stop-color="#c9cccf"/><stop offset=".6" stop-color="#eceeef"/><stop offset="1" stop-color="#b9bcc0"/></linearGradient>'
       + '<linearGradient id="band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6d7d9"/><stop offset="1" stop-color="#cbccce"/></linearGradient></defs>'
       + '<rect width="%d" height="%d" fill="url(#bg)"/><rect width="%d" height="%d" fill="url(#glowR)"/>' % (W, H, W, H)
       + '<path d="M560 -30 L1040 -30 L1040 60 L700 90Z" fill="url(#streak)" filter="url(#soft)"/>'
       + '<g fill="none" stroke-linecap="round">' + dots + '</g>'
       + '<text x="27" y="38" ' + F + ' font-weight="700" font-size="19.5" letter-spacing=".3" fill="#fff">CUSTOMER CARE: 022-71209091</text>'
       + '<text x="965" y="38" text-anchor="end" ' + F + ' font-weight="700" font-size="19.5" letter-spacing=".3" fill="#fff">ELECTRONIC USE ONLY</text>'
       + '<rect x="0" y="57" width="%d" height="99" fill="url(#band)"/>' % W
       + '<text x="495" y="116" text-anchor="middle" ' + F + ' font-size="27" fill="#3b3b3d">2 Track HiCo COLORPLASTR01662-01 0926</text>'
       + holo
       + '<rect x="264" y="178" width="353" height="99" fill="#fff"/><rect x="617" y="193" width="93" height="68" fill="#fff"/>'
       + '<text x="286" y="220" ' + F + ' font-size="21" letter-spacing=".5" fill="#a9abae">VOID VOID VOID VOID VOID</text>'
       + '<text x="286" y="246" ' + F + ' font-weight="700" font-size="19" fill="#9b9da0" textLength="300" lengthAdjust="spacingAndGlyphs">COLORPLASTR01662-01 0926</text>'
       + '<text x="265" y="309" ' + F + ' font-size="18" letter-spacing=".2" fill="#f1e9f5">AUTHORISED SIGNATURE</text>'
       + '<text x="524" y="309" ' + F + ' font-size="18" fill="#f1e9f5">Non Transferable</text>'
       + icons + rbl
       + '<text x="836" y="355" text-anchor="middle" ' + F + ' font-size="17" fill="#fff">Login to App</text>'
       + qr
       + '<text x="836" y="553" text-anchor="middle" ' + F + ' font-size="14.5" fill="#f4eef7">Funds can be used in transit only</text>'
       + '<text x="836" y="593" text-anchor="middle" ' + F + ' font-weight="700" font-size="23.5" fill="#fff">www.opendhi.com</text>'
       + '<text x="31" y="400" ' + F + ' font-weight="700" font-size="14.2" fill="#fff">This card is non-transferable.</text>' + ptxt
       + '<text x="31" y="557" ' + F + ' font-size="13.6" fill="#f4eef7">Email: ppihelpdesk@rbl.bank.in</text>'
       + '<text x="31" y="587" ' + F + ' font-size="13.6" fill="#f4eef7">Follow us on :</text>'
       + '<rect x="124" y="571" width="21" height="21" rx="3" fill="#1877f2"/><path d="M137.6 592v-8h2.7l.4-3.2h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.6v-2.8c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.100v2.3h-2.700v3.200h2.700v8Z" fill="#fff"/>'
       + '<path d="M156 573l13 17M169 573l-13 17" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'
       + '<text x="497" y="593" text-anchor="middle" ' + F + ' font-size="10" fill="#d9c9e2" fill-opacity=".7">COLORPLASTR01662-01 0926</text>'
       + '</svg>')
out = sys.argv[1] if len(sys.argv) > 1 else 'card-back.svg'
open(out, 'w', encoding='utf-8').write(svg)
print(len(svg))
