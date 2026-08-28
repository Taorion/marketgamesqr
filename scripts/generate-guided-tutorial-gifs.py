from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "empresa" / "img" / "tutorials"
OUTPUT.mkdir(parents=True, exist_ok=True)

W, H = 640, 360
NAVY = "#06183b"
PANEL = "#0c2b62"
PANEL_2 = "#123a7b"
CYAN = "#83efff"
MINT = "#64e6c8"
WHITE = "#ffffff"
MUTED = "#c8dcf5"
LINE = "#3563a2"


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


F10 = font(10, True)
F12 = font(12)
F13 = font(13, True)
F15 = font(15, True)
F18 = font(18, True)
F22 = font(22, True)


def rounded(draw, box, radius=14, fill=PANEL, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def label(draw, xy, text, color=WHITE, used_font=F12, anchor=None):
    draw.text(xy, text, fill=color, font=used_font, anchor=anchor)


def base(title, eyebrow):
    image = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(image)
    for x in range(W):
        tone = int(10 + (x / W) * 14)
        draw.line((x, 0, x, H), fill=(5, 22 + tone // 3, 54 + tone))
    rounded(draw, (18, 16, 622, 344), 24, fill="#071f4c", outline="#234f88")
    label(draw, (42, 36), eyebrow.upper(), CYAN, F10)
    label(draw, (42, 57), title, WHITE, F22)
    draw.line((42, 91, 598, 91), fill="#234f88", width=1)
    return image, draw


def cursor(draw, x, y, active=False):
    color = MINT if active else WHITE
    draw.polygon([(x, y), (x + 2, y + 23), (x + 7, y + 17), (x + 13, y + 26), (x + 18, y + 23), (x + 12, y + 15), (x + 20, y + 13)], fill=color, outline=NAVY)
    if active:
        draw.ellipse((x - 9, y - 9, x + 29, y + 29), outline=MINT, width=2)


def dropdown(draw, box, caption, value, active=False):
    x1, y1, x2, y2 = box
    label(draw, (x1, y1 - 19), caption, WHITE, F12)
    rounded(draw, box, 9, fill="#091d43", outline=CYAN if active else LINE, width=2 if active else 1)
    label(draw, (x1 + 13, (y1 + y2) // 2), value, WHITE, F13, "lm")
    label(draw, (x2 - 17, (y1 + y2) // 2), "⌄", CYAN, F18, "mm")


def success(draw, text):
    rounded(draw, (410, 294, 588, 327), 10, fill="#0c574f", outline=MINT)
    label(draw, (428, 310), "✓", WHITE, F15, "mm")
    label(draw, (447, 310), text, WHITE, F12, "lm")


def sellers(frame):
    image, draw = base("Crear y preparar vendedores", "Equipo comercial")
    rounded(draw, (42, 112, 245, 307), 16, fill=PANEL)
    label(draw, (60, 132), "VENDEDORES", CYAN, F10)
    for idx, name in enumerate(["Laura Méndez", "Mateo Ríos", "Sofía Ruiz"]):
        y = 158 + idx * 43
        draw.ellipse((59, y, 83, y + 24), fill="#2874b9")
        label(draw, (71, y + 12), name[0], WHITE, F12, "mm")
        label(draw, (94, y + 4), name, WHITE, F13)
        label(draw, (94, y + 21), "Activo", MUTED, F10)
    rounded(draw, (266, 112, 598, 307), 16, fill=PANEL_2)
    label(draw, (286, 132), "NUEVO VENDEDOR", CYAN, F10)
    for y, text in [(164, "Nombre completo"), (211, "Correo corporativo")]:
        rounded(draw, (286, y, 575, y + 34), 8, fill="#091d43", outline=CYAN if frame == 1 else LINE)
        label(draw, (299, y + 17), text if frame < 2 else ("Valentina Torres" if y == 164 else "valentina@empresa.com"), WHITE, F12, "lm")
    rounded(draw, (445, 264, 575, 294), 10, fill="#1e62c7" if frame < 2 else "#168876")
    label(draw, (510, 279), "Guardar vendedor" if frame < 2 else "Vendedor listo", WHITE, F12, "mm")
    cursor(draw, 548, 277, frame == 1)
    if frame == 3: success(draw, "Acceso preparado")
    return image


def contacts(frame):
    image, draw = base("Asignar responsable a un contacto", "Directorio comercial")
    rounded(draw, (42, 116, 598, 294), 18, fill=PANEL)
    draw.ellipse((65, 146, 111, 192), fill="#2b73b5")
    label(draw, (88, 169), "AM", WHITE, F13, "mm")
    label(draw, (128, 145), "Andrea Molina", WHITE, F18)
    label(draw, (128, 171), "Lead · WhatsApp · Interés alto", MUTED, F12)
    dropdown(draw, (128, 219, 558, 263), "Responsable", "Sin responsable" if frame < 2 else "Sofía Ruiz", frame in (1, 2))
    cursor(draw, 522, 232, frame == 1)
    if frame == 3: success(draw, "Responsable asignado")
    return image


def contact_import(frame):
    image, draw = base("Importar contactos con responsable", "Clientes · carga segura")
    dropdown(draw, (42, 132, 598, 176), "Vendedor predeterminado del lote", "Sin responsable" if frame == 0 else "Laura Méndez", frame == 1)
    rounded(draw, (42, 199, 598, 286), 15, fill="#0a224f", outline=CYAN if frame == 2 else LINE, width=2)
    label(draw, (320, 225), "↑  Arrastra el CSV o selecciónalo", WHITE, F15, "mm")
    label(draw, (320, 254), "contactos-agosto.csv · 126 filas", MUTED if frame < 3 else MINT, F12, "mm")
    cursor(draw, 516 if frame < 2 else 340, 145 if frame < 2 else 233, frame in (1, 2))
    if frame == 3: success(draw, "126 filas validadas")
    return image


def activations(frame):
    image, draw = base("Asignar activaciones a vendedores", "Activation Studio")
    rounded(draw, (42, 116, 598, 301), 18, fill=PANEL)
    label(draw, (64, 137), "NUEVA ACTIVACIÓN", CYAN, F10)
    rounded(draw, (64, 163, 576, 200), 9, fill="#091d43", outline=LINE)
    label(draw, (78, 181), "Trivia lanzamiento agosto", WHITE, F13, "lm")
    dropdown(draw, (64, 236, 576, 278), "Vendedor responsable · opcional", "Sin vendedor asignado" if frame < 2 else "Mateo Ríos", frame in (1, 2))
    cursor(draw, 537, 247, frame == 1)
    if frame == 3: success(draw, "Atribución preparada")
    return image


def sales(frame):
    image, draw = base("Registrar una venta atribuida", "Revenue Command")
    rounded(draw, (42, 112, 598, 304), 18, fill=PANEL)
    label(draw, (64, 132), "REGISTRO COMPLETO DE VENTA", CYAN, F10)
    dropdown(draw, (64, 171, 338, 213), "Cliente", "Andrea Molina", False)
    dropdown(draw, (356, 171, 576, 213), "Total", "$ 480.000", False)
    dropdown(draw, (64, 253, 576, 290), "Vendedor responsable", "Sin responsable" if frame < 2 else "Sofía Ruiz", frame in (1, 2))
    cursor(draw, 538, 261, frame == 1)
    if frame == 3: success(draw, "Venta bien atribuida")
    return image


def revenue(frame):
    image, draw = base("Analizar resultados por vendedor", "Revenue Center")
    dropdown(draw, (342, 111, 598, 151), "Analizar vendedor", "Todo el equipo" if frame < 2 else "Sofía Ruiz", frame in (1, 2))
    for idx, (value, caption) in enumerate([("24", "Leads propios"), ("29%", "Conversión"), ("$ 8,4 M", "Revenue")]):
        x = 42 + idx * 186
        rounded(draw, (x, 175, x + 170, 243), 13, fill=PANEL)
        label(draw, (x + 14, 190), caption, MUTED, F10)
        label(draw, (x + 14, 211), value if frame >= 2 else "—", WHITE, F18)
    points = [(58, 292), (133, 266), (208, 282), (283, 248), (358, 260), (433, 224), (508, 238), (574, 203)]
    for idx in range(len(points) - 1):
        end = idx + 1 if frame >= 2 else max(1, frame * 3)
        if idx < end: draw.line((points[idx], points[idx + 1]), fill=MINT, width=4)
    for x, y in points[: (len(points) if frame >= 2 else 3)]: draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=WHITE)
    cursor(draw, 557, 120, frame == 1)
    if frame == 3: success(draw, "Lente individual activa")
    return image


ASSETS = {
    "sellers": sellers,
    "contacts": contacts,
    "contacts-import": contact_import,
    "activations": activations,
    "sales": sales,
    "revenue": revenue,
}

for slug, renderer in ASSETS.items():
    frames = [renderer(index).quantize(colors=96, method=Image.Quantize.MEDIANCUT) for index in range(4)]
    frames[0].save(
        OUTPUT / f"qori-guide-{slug}.gif",
        save_all=True,
        append_images=frames[1:],
        duration=[800, 700, 900, 1100],
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(OUTPUT / f"qori-guide-{slug}.gif")
