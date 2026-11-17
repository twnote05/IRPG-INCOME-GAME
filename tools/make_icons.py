"""สร้างไอคอนแอป KayanJoD ด้วย stdlib ล้วน — ไม่ต้องลง Pillow

    python tools/make_icons.py

เขียนทับไฟล์ใน public/: icon-192 · icon-512 · icon-maskable-512 · apple-touch-icon · favicon-32

แนวคิด: ใช้ภาษาภาพของแอปเอง ไม่ใช่กระเป๋าเงินหรือเหรียญแบบแอปการเงินทั่วไป
หน้าบันทึกมีปฏิทินที่ระบายช่องวันตามการใช้จ่าย ไอคอนจึงเป็น **ตารางวัน 3x3**
บนพื้นสีหลักของแอป โดยช่องกลางเป็นสีเขียวเดียวกับช่อง "ไม่เกินยอดต่อวัน"
อ่านได้ว่า "จดครบทุกวัน" ซึ่งตรงกับชื่อแอปพอดี

ไม่มีตัวอักษร เพราะย่อเหลือ 32px แล้วอ่านไม่ออกอยู่ดี
ลบรอยหยักด้วยการสุ่มตัวอย่าง 4x4 ต่อพิกเซล
"""
import struct
import zlib

BG = (0x15, 0x50, 0x9e)      # --accent โหมดสว่าง
CELL = (0x5b, 0x8c, 0xcd)    # ช่องวันทั่วไป ฟ้าอ่อนลงจากพื้น
TODAY = (0x6f, 0xc4, 0x62)   # --t-under ช่อง "ไม่เกินยอดต่อวัน"

SS = 4                       # ตัวอย่างต่อด้าน


def rrect(x, y, cx, cy, w, h, r):
    """อยู่ในสี่เหลี่ยมมุมมนรึเปล่า"""
    px, py = abs(x - cx) - (w / 2 - r), abs(y - cy) - (h / 2 - r)
    if px <= 0 or py <= 0:
        return abs(x - cx) <= w / 2 and abs(y - cy) <= h / 2
    return px * px + py * py <= r * r


def build(S, content, rounded):
    """content = สัดส่วนที่ตารางกินพื้นที่ · rounded = มุมมนของพื้นหลัง (None = เต็มผืน)"""
    mid = S / 2.0
    grid = S * content
    gap = grid * 0.11
    cell = (grid - gap * 2) / 3.0
    cr = cell * 0.26                       # มุมมนของช่องวัน
    left = top = mid - grid / 2

    cells = []
    for row in range(3):
        for col in range(3):
            cx = left + col * (cell + gap) + cell / 2
            cy = top + row * (cell + gap) + cell / 2
            cells.append((cx, cy, TODAY if (row, col) == (1, 1) else CELL))

    rows = bytearray()
    step = 1.0 / SS
    for py in range(S):
        rows.append(0)                                        # PNG filter: none
        for px in range(S):
            acc = [0.0, 0.0, 0.0]
            for sy in range(SS):
                for sx in range(SS):
                    x, y = px + (sx + 0.5) * step, py + (sy + 0.5) * step
                    if rounded is not None and not rrect(x, y, mid, mid, S, S, rounded):
                        col = (0xf4, 0xf3, 0xf0)              # --page รอบมุมที่เจียนออก
                    else:
                        col = BG
                        for ccx, ccy, c in cells:
                            if rrect(x, y, ccx, ccy, cell, cell, cr):
                                col = c
                                break
                    for i in range(3):
                        acc[i] += col[i]
            n = SS * SS
            rows += bytes(int(v / n + 0.5) for v in acc)
    return rows


def write_png(path, S, rows):
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c))
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', S, S, 8, 2, 0, 0, 0)))   # 8-bit RGB
        f.write(chunk(b'IDAT', zlib.compress(bytes(rows), 9)))
        f.write(chunk(b'IEND', b''))


# (ไฟล์, ขนาด, สัดส่วนตาราง, มุมมนพื้นหลัง)
#   maskable กับ apple-touch เต็มผืน เพราะระบบปฏิบัติการครอปเอง
#   maskable ตารางเล็กลงให้อยู่ในเขตปลอดภัยตอนโดนครอปเป็นวงกลม
JOBS = [
    ('public/icon-192.png', 192, 0.62, 0.22),
    ('public/icon-512.png', 512, 0.62, 0.22),
    ('public/icon-maskable-512.png', 512, 0.48, None),
    ('public/apple-touch-icon.png', 180, 0.62, None),
    ('public/favicon-32.png', 32, 0.72, None),
]

if __name__ == '__main__':
    for path, size, content, rounded in JOBS:
        write_png(path, size, build(size, content, None if rounded is None else size * rounded))
        print(path)
