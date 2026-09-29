# Pixel landscapes behind the hero (96x54): night sky, mountains, castle / forest, grassy ground.
# Uses sprite palette chars; '0'-'9' are scene-only colors (sky bands, hills, stars, moon) recolored by time of day.
import json, random, sys
W, H = 96, 54
GROUND = 43  # first grass row; the hero stands around here

def blank():
    return [['.'] * W for _ in range(H)]

def sky(g, seed):
    bands = [(0, '1'), (12, '2'), (24, '3'), (34, '4')]
    for y in range(H):
        c = [b for b in bands if y >= b[0]][-1][1]
        for x in range(W):
            g[y][x] = c
        # ordered dither on the row above each band change
        for y0, c2 in bands[1:]:
            if y == y0 - 1:
                for x in range(0, W, 2): g[y][x + (y % 2) if x + 1 < W else x] = c2
    rnd = random.Random(seed)
    for _ in range(40):
        x, y = rnd.randrange(W), rnd.randrange(22)
        g[y][x] = '7'  # star (hidden by day: recolored to the sky)
    for y in range(H):  # moon
        for x in range(W):
            if (x - 80) ** 2 + (y - 8) ** 2 <= 16: g[y][x] = '8'  # moon / sun
            if (x - 81.5) ** 2 + (y - 7) ** 2 <= 5: g[y][x] = '9'

def ridge(g, peaks, base, fill, cap=None, shade=None):
    """peaks: [(x, height)] → a mountain range drawn down to `base` row."""
    for x in range(W):
        h = max((ph - abs(x - px) * 1.1 for px, ph in peaks), default=0)
        top = round(base - h)
        for y in range(max(0, top), base + 1):
            g[y][x] = fill
            if shade and any(x > px for px, _ in peaks) and (x - min(peaks, key=lambda p: abs(x - p[0]))[0]) > 0: g[y][x] = shade
        if cap and h > 10:
            for y in range(max(0, top), min(base, top + 2)): g[y][x] = cap

def trees(g, xs, base, dark='6', light='G'):
    for cx, hgt in xs:
        for y in range(base - hgt, base + 1):
            half = (y - (base - hgt)) // 2 + 1
            for x in range(cx - half, cx + half + 1):
                if 0 <= x < W and 0 <= y < H:
                    g[y][x] = light if x < cx else dark
        for y in range(base + 1, base + 3):  # trunk
            if 0 <= cx < W and y < H: g[y][cx] = 'd'

def castle(g, x0, base):
    def box(a, b, top, c='S'):
        for x in range(a, b + 1):
            for y in range(top, base + 1):
                g[y][x] = c
    box(x0, x0 + 24, base - 12)                    # wall
    for t in (x0, x0 + 18):                          # towers
        box(t, t + 6, base - 20)
        for x in range(t, t + 7, 2): g[base - 21][x] = 'S'
        g[base - 16][t + 3] = 'y'
    box(x0 + 9, x0 + 15, base - 24)                  # keep
    for x in range(x0 + 9, x0 + 16, 2): g[base - 25][x] = 'S'
    g[base - 28][x0 + 12] = 'k'
    for y in range(base - 29, base - 25): g[y][x0 + 12] = 'k'
    g[base - 29][x0 + 13] = 'r'; g[base - 28][x0 + 13] = 'r'  # flag
    g[base - 19][x0 + 12] = 'y'; g[base - 18][x0 + 12] = 'y'
    for x in range(x0, x0 + 25, 2): g[base - 13][x] = 'S'
    box(x0 + 10, x0 + 14, base - 5, 'k')             # gate
    for y in range(base - 20, base + 1):             # right-side shade
        for x in (x0 + 6, x0 + 24):
            if g[y][x] == 'S': g[y][x] = '5'

def ground(g, path=True):
    for y in range(GROUND, H):
        for x in range(W):
            g[y][x] = 'g' if y == GROUND else 'G'
            if y > GROUND + 1 and (x + y) % 7 == 0: g[y][x] = 'g'
    if path:
        for y in range(GROUND, H):
            half = 3 + (y - GROUND)
            for x in range(48 - half, 48 + half):
                if 0 <= x < W: g[y][x] = 'b' if (x + y) % 5 else 'd'

out = {}
g = blank(); sky(g, 1)
ridge(g, [(10, 18), (34, 24), (70, 16), (92, 20)], 40, '5', cap='w')
ridge(g, [(0, 8), (26, 10), (60, 7), (88, 11)], 42, '0')
castle(g, 62, GROUND - 1)
trees(g, [(4, 8), (11, 11), (18, 7), (86, 9), (93, 7)], GROUND - 1)
ground(g); out['bg_castle'] = [''.join(r) for r in g]

g = blank(); sky(g, 2)
ridge(g, [(20, 14), (60, 18), (90, 12)], 38, '5', cap='w')
trees(g, [(x, 10 + (x * 7) % 9) for x in range(2, 96, 6)], GROUND - 3)
trees(g, [(x, 12 + (x * 5) % 8) for x in list(range(0, 36, 5)) + list(range(62, 96, 5))], GROUND - 1, dark='k', light='6')
ground(g); out['bg_forest'] = [''.join(r) for r in g]

g = blank(); sky(g, 3)
ridge(g, [(18, 30), (52, 36), (84, 28)], 40, '5', cap='w')
ridge(g, [(6, 12), (36, 9), (70, 14)], 42, '0')
trees(g, [(8, 7), (14, 9), (80, 8), (88, 10)], GROUND - 1)
ground(g, path=False); out['bg_mountain'] = [''.join(r) for r in g]

for n, r in out.items():
    assert len(r) == H and all(len(x) == W for x in r), n
json.dump(out, open(sys.argv[1], 'w'))
print('scenes ok')
