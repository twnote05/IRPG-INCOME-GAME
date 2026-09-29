# Generates the 24x40 human hero + appearance + gear layers for src/lib/sprites.ts.
# Style (from the user's refs): black 1px outline, flat colors with one shade on the right/bottom,
# ~3.3 heads tall, blank-slate base in underwear; clothes are separate layers.
# Recolorable chars: n/N = skin (base/shade), a/A = hair (base/shade).
import json, sys
W, H = 24, 40

def ell(cx, cy, rx, ry):
    return {(x, y) for x in range(W) for y in range(H) if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1}
def rect(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}
def trap(y0, y1, xl0, xr0, xl1, xr1):
    out = set()
    for y in range(y0, y1 + 1):
        t = (y - y0) / max(1, y1 - y0)
        out |= {(x, y) for x in range(round(xl0 + (xl1 - xl0) * t), round(xr0 + (xr1 - xr0) * t) + 1)}
    return out

N8 = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)]

def shade(mask, base, dark, outline=True, avoid=frozenset()):
    """Flat fill, one shade on the right and bottom edges, 1px black outline outside."""
    px = {}
    for (x, y) in mask:
        px[(x, y)] = dark if (x + 1, y) not in mask or (x, y + 1) not in mask else base
    if outline:
        for (x, y) in mask:
            for dx, dy in N8:
                q = (x + dx, y + dy)
                if q not in mask and q not in avoid and 0 <= q[0] < W and 0 <= q[1] < H: px.setdefault(q, 'k')
    return px

def layer(*parts, avoid=frozenset()):
    """parts = (mask, base, dark) painted in order; each keeps its own outline."""
    px = {}
    for mask, base, dark in parts:
        sh = shade(mask, base, dark, avoid=avoid)
        for q, c in sh.items():
            if c == 'k' and q in px and px[q] != 'k': continue  # a later part's outline doesn't cut an earlier fill
            px[q] = c
    return px

def rows(px):
    g = [['.'] * W for _ in range(H)]
    for (x, y), c in px.items():
        if 0 <= x < W and 0 <= y < H: g[y][x] = c
    return [''.join(r) for r in g]

def put(px, pts, c):
    for p in pts: px[p] = c
    return px

out = {}

# ---------- base body ----------
head = rect(7, 7, 16, 17) - {(7, 7), (16, 7), (7, 17), (16, 17), (7, 16), (16, 16)}
ears = rect(6, 11, 6, 13) | rect(17, 11, 17, 13)
neck = rect(10, 18, 13, 18)
torso = rect(8, 19, 15, 27) | rect(7, 19, 16, 20)
arms = rect(5, 19, 6, 28) | rect(17, 19, 18, 28)
hands = rect(5, 29, 6, 30) | rect(17, 29, 18, 30)
legs = rect(8, 31, 10, 37) | rect(13, 31, 15, 37)
feet = rect(8, 38, 11, 38) | rect(12, 38, 15, 38)
skin = head | ears | neck | torso | arms | hands | legs | feet
pants = rect(8, 28, 15, 30)
hero = layer((skin, 'n', 'N'), (pants, 'w', 's'))
# face: brows, eyes, nose shade, mouth
put(hero, [(9, 11), (10, 11), (13, 11), (14, 11)], 'A')
put(hero, [(10, 12), (13, 12)], 'k')
put(hero, [(12, 13), (12, 14)], 'N')
put(hero, [(11, 16), (12, 16)], 'N')
put(hero, [(11, 21), (12, 21), (10, 24), (13, 24)], 'N')  # chest / belly hint
out['hero'] = rows(hero)

# female base: narrower shoulders, waist, wider hips, lashes + lips, two-piece underwear
torso_f = rect(8, 19, 15, 23) | rect(9, 24, 14, 26) | rect(8, 27, 15, 27)
skin_f = head | ears | neck | torso_f | arms | hands | legs | feet
hero_f = layer((skin_f, 'n', 'N'), (rect(8, 21, 15, 22), 'w', 's'), (rect(8, 28, 15, 30), 'w', 's'))
put(hero_f, [(9, 11), (10, 11), (13, 11), (14, 11)], 'A')
put(hero_f, [(10, 12), (13, 12), (9, 12), (14, 12)], 'k')
put(hero_f, [(12, 14)], 'N')
put(hero_f, [(11, 16), (12, 16)], 'r')
out['hero_f'] = rows(hero_f)

# ---------- hair (a/A) ----------
top = rect(7, 5, 16, 8) - {(7, 5), (16, 5)}
side = rect(7, 9, 7, 11) | rect(16, 9, 16, 11)
B = skin | pants  # body pixels thin layers must not outline over
out['hair_short'] = rows(layer((top | side, 'a', 'A'), avoid=head))
out['hair_buzz'] = rows(layer((rect(8, 6, 15, 7), 'A', 'A'), avoid=head))
out['hair_bun'] = rows(layer((top | side | ell(12, 3, 2.3, 2), 'a', 'A'), avoid=head))
out['hair_long'] = rows(layer((top | side | rect(5, 8, 6, 21) | rect(17, 8, 18, 21), 'a', 'A'), avoid=B))
out['hair_spiky'] = rows(layer((top | side | {(9, 4), (12, 3), (12, 4), (15, 4), (10, 4), (13, 4)}, 'a', 'A'), avoid=head))
# ---------- beards ----------
out['beard_stubble'] = rows({p: 'A' for p in rect(8, 14, 15, 17) if (p[0] + p[1]) % 2 and p in head})
out['beard_full'] = rows(put(layer((rect(7, 13, 16, 17) | rect(9, 18, 14, 19), 'a', 'A'), avoid=B), [(11, 16), (12, 16)], 'k'))
out['beard_mustache'] = rows(layer((rect(10, 15, 13, 15), 'a', 'A'), avoid=B))

# ---------- gear ----------
face = rect(8, 10, 15, 17)
out['g_hood'] = rows(layer(((rect(6, 5, 17, 18) | rect(5, 18, 18, 21)) - face - {(6, 5), (17, 5)}, 'g', 'G')))
out['g_helm'] = rows(put(layer((rect(6, 4, 17, 11) - {(6, 4), (17, 4)} | rect(6, 12, 7, 15) | rect(16, 12, 17, 15), 's', 'S')),
                         [(x, 10) for x in range(8, 16)], 'k'))
out['g_wizard'] = rows(put(layer((trap(0, 6, 12, 12, 8, 16), 'p', 'P'), (rect(4, 7, 19, 8), 'p', 'P')), [(12, 3)], 'y'))
out['g_crown'] = rows(put(layer((rect(7, 4, 16, 6) | {(7, 3), (10, 2), (10, 3), (13, 2), (13, 3), (16, 3)}, 'y', 'o')),
                          [(9, 5), (14, 5)], 'r'))
out['g_straw'] = rows(put(layer((rect(8, 2, 15, 6) - {(8, 2), (15, 2)}, 'y', 'o'), (rect(4, 7, 19, 8) - {(4, 8), (19, 8)}, 'y', 'o')),
                          [(x, 6) for x in range(8, 16)], 'b'))

tunic = rect(8, 19, 15, 28) | rect(7, 19, 16, 20)
out['g_shirt'] = rows(put(layer((tunic | rect(5, 19, 6, 24) | rect(17, 19, 18, 24), 'r', 'R')),
                          [(x, y) for x in range(7, 17) for y in (21, 24, 27)] + [(5, 22), (18, 22)], 'R'))
out['g_leather'] = rows(put(layer((tunic | rect(5, 19, 6, 23) | rect(17, 19, 18, 23), 'w', 's'), (tunic - rect(11, 19, 12, 23), 'b', 'd')),
                            [(10, 25), (13, 25)], 'y'))
out['g_plate'] = rows(put(layer((tunic | rect(5, 21, 6, 28) | rect(17, 21, 18, 28), 's', 'S'),
                                (ell(5.5, 20, 2.6, 2.3) | ell(18.5, 20, 2.6, 2.3), 's', 'S')),
                          [(11, 22), (12, 22), (11, 23), (12, 23)], 'y'))
out['g_robe'] = rows(put(layer((trap(19, 37, 7, 16, 5, 18) | rect(5, 19, 6, 28) | rect(17, 19, 18, 28), 'p', 'P')),
                         [(x, 27) for x in range(7, 17)] + [(11, y) for y in range(19, 23)], 'y'))

jeans = rect(8, 28, 15, 31) | rect(8, 31, 11, 35) | rect(12, 31, 15, 35)
boots = rect(7, 35, 11, 38) | rect(12, 35, 16, 38)
out['g_jeans'] = rows(layer((jeans, 'c', 'C'), (boots, 'b', 'd')))
out['g_trousers'] = rows(layer((jeans, 'b', 'd'), (boots, 'd', 'k')))
out['g_greaves'] = rows(layer((jeans, 's', 'S'), (boots, 'S', 'k')))

out['g_sword'] = rows(layer((rect(3, 13, 4, 27), 'W', 's'), (rect(1, 28, 6, 28), 'y', 'o'), (rect(3, 29, 4, 31), 'b', 'd'), avoid=B))
out['g_flame'] = rows(put(layer((rect(3, 12, 4, 27) | {(3, 11)}, 'r', 'R'), (rect(1, 28, 6, 28), 'y', 'o'), (rect(3, 29, 4, 31), 'd', 'k'), avoid=B),
                          [(3, 15), (4, 18), (3, 21), (4, 24)], 'y'))
out['g_staff'] = rows(put(layer((rect(3, 12, 4, 38), 'b', 'd'), (ell(3.8, 10, 2.4, 2.4), 'c', 'C'), avoid=B), [(3, 9)], 'W'))
out['g_bow'] = rows(layer((ell(4.5, 29, 4.6, 10) - ell(6, 29, 4.6, 10) - rect(5, 0, 23, 39), 'b', 'd'), (rect(4, 20, 4, 38), 'w', 'w'), avoid=B))

out['g_shield'] = rows(put(layer((trap(23, 31, 16, 22, 17, 21) | trap(32, 34, 17, 21, 19, 19), 'c', 'C'), avoid=B),
                           [(19, 25), (19, 26), (19, 27), (19, 28), (18, 26), (20, 26)], 'y'))
out['g_lantern'] = rows(put(layer((rect(18, 31, 18, 31), 'o', 'o'), (rect(17, 32, 20, 37), 'y', 'o'), avoid=B), [(18, 34), (19, 34), (18, 35), (19, 35)], 'W'))
out['g_tome'] = rows(put(layer((rect(17, 26, 22, 33), 'r', 'R'), avoid=B), [(19, 28), (20, 28), (19, 30), (20, 30)], 'y'))

for n, r in out.items():
    assert len(r) == H and all(len(x) == W for x in r), n
json.dump(out, open(sys.argv[1], 'w'))
print(len(out), 'sprites')
