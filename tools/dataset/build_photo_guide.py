"""Build the 2-page cat photo collection guide (DOCX -> PDF)."""

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.shared import Inches, Pt, RGBColor

DOC_PATH = "docs/guides/Cat_Photo_Collection_Guide.docx"

INK = RGBColor(0x0B, 0x1C, 0x30)
ACCENT = RGBColor(0x03, 0x69, 0xA1)
MUTED = RGBColor(0x47, 0x55, 0x69)


def tighten(document):
    for style_name in ("Normal", "List Bullet", "List Number"):
        style = document.styles[style_name]
        style.font.name = "Calibri"
        style.font.size = Pt(10.5)
        style.font.color.rgb = INK
        paragraph = style.paragraph_format
        paragraph.space_before = Pt(0)
        paragraph.space_after = Pt(4)
        paragraph.line_spacing = 1.12


def heading(document, text, size=14, space_before=12):
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(space_before)
    paragraph.paragraph_format.space_after = Pt(4)
    run = paragraph.add_run(text)
    run.bold = True
    run.font.size = Pt(size)
    run.font.color.rgb = ACCENT
    return paragraph


def body(document, text, size=10.5, italic=False, bold=False):
    paragraph = document.add_paragraph()
    run = paragraph.add_run(text)
    run.font.size = Pt(size)
    run.italic = italic
    run.bold = bold
    return paragraph


def bullets(document, items, numbered=False):
    style = "List Number" if numbered else "List Bullet"
    for item in items:
        paragraph = document.add_paragraph(style=style)
        paragraph.paragraph_format.space_after = Pt(3)
        paragraph.paragraph_format.left_indent = Inches(0.24)
        run = paragraph.add_run(item)
        run.font.size = Pt(10.5)


def build():
    document = Document()
    section = document.sections[0]
    section.top_margin = Inches(0.5)
    section.bottom_margin = Inches(0.45)
    section.left_margin = Inches(0.6)
    section.right_margin = Inches(0.6)
    tighten(document)

    # ---------------- Page 1 ----------------
    title = document.add_paragraph()
    title.paragraph_format.space_after = Pt(1)
    run = title.add_run("Cat Body-Part Dataset: Photo Collection Guide")
    run.bold = True
    run.font.size = Pt(17)
    run.font.color.rgb = INK

    subtitle = document.add_paragraph()
    subtitle.paragraph_format.space_after = Pt(8)
    run = subtitle.add_run(
        "Prepared for: dataset preparation  |  Project: PawSpeak (on-device cat body-language detection)  |  Version 1.0"
    )
    run.font.size = Pt(8.5)
    run.font.color.rgb = MUTED

    body(
        document,
        "Why we need this: our detector currently identifies the animal only. To describe body language we need a "
        "second model that locates five parts - ears, eyes, mouth, tail, body - inside a photo of a cat. That model "
        "learns from photos where each part has been boxed. You are collecting those photos.",
        size=9.5,
    )

    heading(document, "1. What to collect")
    bullets(document, [
        "Target: 300-500 photos of cats. More cats and more poses matter more than repeating one cat.",
        "Each photo must be a real photograph. Screenshots, drawings, cartoons, AI-generated images and stock "
        "watermarks are not usable.",
        "One cat per photo is strongly preferred. Multiple cats are usable but harder to label correctly.",
        "Variety beats volume: different breeds, colours, ages, backgrounds, indoor and outdoor light.",
        "Include cats that are NOT boxed-correctly too - no tail visible, walking away, partly hidden. Real "
        "photographs where a part is missing teach the model that absence is normal.",
    ])

    heading(document, "2. The five parts we must see clearly")
    table = document.add_table(rows=6, cols=3)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    rows = [
        ("Part", "What 'a clean example' means", "Avoid"),
        ("ears", "Both ears distinguishable from the head outline", "Ears merged into dark fur"),
        ("eyes", "Both eye shapes visible, not closed slits only", "Heavy glare or motion blur"),
        ("mouth", "Muzzle and mouth line readable", "Photo cropped above the mouth"),
        ("tail", "Whole tail in frame, not cut off at the edge", "Tail leaving the frame"),
        ("body", "Most of the torso visible in one frame", "Only the head fills the photo"),
    ]
    for row_index, values in enumerate(rows):
        cells = table.rows[row_index].cells
        for col_index, value in enumerate(values):
            cells[col_index].text = ""
            paragraph = cells[col_index].paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(1)
            run = paragraph.add_run(value)
            run.font.size = Pt(8.5)
            run.bold = row_index == 0
    for row in table.rows:
        row.cells[0].width = Inches(0.85)
        row.cells[1].width = Inches(3.6)
        row.cells[2].width = Inches(2.2)

    heading(document, "3. How to shoot")
    bullets(document, [
        "Prefer a side-on or three-quarter view. A straight-on face shot hides the tail and torso.",
        "Fill roughly half the frame with the cat. Too far away and the parts become a few pixels.",
        "Use daylight or a well-lit room. Avoid backlighting, harsh flash and heavy shadows.",
        "Hold still; motion blur on the tail is the most common reason a photo is rejected.",
        "Shoot several frames of the same pose - the best one is often the third or fourth.",
    ])

    heading(document, "4. A balanced set looks like this")
    balance = document.add_table(rows=5, cols=3)
    balance.style = "Table Grid"
    balance_rows = [
        ("Pose", "Target share", "Typical example"),
        ("Side-on, full body", "~40%", "Cat standing sideways, tail visible"),
        ("Three-quarter / sitting", "~30%", "Cat sitting facing slightly away"),
        ("Front / face-focused", "~20%", "Ears and eyes clear, tail hidden"),
        ("Awkward or partial", "~10%", "Walking away, tail cut off, curled up"),
    ]
    for row_index, values in enumerate(balance_rows):
        cells = balance.rows[row_index].cells
        for col_index, value in enumerate(values):
            cells[col_index].text = ""
            paragraph = cells[col_index].paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(1)
            run = paragraph.add_run(value)
            run.font.size = Pt(9.5)
            run.bold = row_index == 0
    for row in balance.rows:
        row.cells[0].width = Inches(2.1)
        row.cells[1].width = Inches(1.1)
        row.cells[2].width = Inches(3.4)

    document.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    # ---------------- Page 2 ----------------
    heading(document, "5. Legal and privacy rules (non-negotiable)", space_before=0)
    bullets(document, [
        "Only photographs you personally took, or that are explicitly CC0 / public domain.",
        "Do NOT use images from Google Images, Pinterest, Instagram, Reddit, news sites or the body-language PDF. "
        "Those are third-party copyrighted photos and cannot ship inside the app.",
        "Photos of other people's cats need that person's permission - get it in writing (a message is fine).",
        "Never include people's faces, children, house numbers, licence plates or anything identifying a home.",
        "Strip photo metadata before delivery. Ask the team to run the provided command if unsure.",
    ])
    body(
        document,
        "Why so strict: the finished model is packaged into a distributed app. Using one unlicensed photo creates "
        "a legal problem for the whole product, and it cannot be undone after release.",
        size=9,
        italic=True,
    )

    heading(document, "6. File naming and folder layout")
    body(document, "Deliver one folder with photos only, named like this:", size=9)
    naming = document.add_paragraph()
    naming.paragraph_format.left_indent = Inches(0.22)
    naming.paragraph_format.space_after = Pt(4)
    run = naming.add_run("cat_0001_side_ears-tail.jpg      cat_0002_front_face.jpg      cat_0003_back_tail-only.jpg")
    run.font.name = "Consolas"
    run.font.size = Pt(8.5)
    run.font.color.rgb = ACCENT
    bullets(document, [
        "Number sequentially from cat_0001. Never renumber or reuse a number later.",
        "After the number, add the pose in one word (side, front, back, sitting, walking, lying).",
        "List the parts that are clearly visible, separated by hyphens.",
        "JPG or PNG only, longest side at least 640 px, file size under 10 MB.",
        "Do not rename, move or edit photos after they have been labelled - the labels reference these filenames.",
    ])

    heading(document, "7. What happens next (so you know the goal)")
    bullets(document, [
        "We run an auto-labeller that proposes boxes for the five parts on every photo.",
        "A human reviews the proposals and deletes the wrong ones. This review step is what makes the dataset "
        "trustworthy - unreviewed auto-labels teach the model to hallucinate tails.",
        "The reviewed dataset trains a small detector that is converted to run on the phone.",
        "In the app, two agreeing parts are required before any cue is shown. One part alone is never enough.",
    ], numbered=True)

    heading(document, "8. Definition of done")
    checklist = document.add_table(rows=6, cols=2)
    checklist.style = "Table Grid"
    checks = [
        ("Requirement", "Confirm"),
        ("300+ photographs of real cats", "\u2610"),
        ("All five parts represented across the set", "\u2610"),
        ("No third-party or AI-generated images", "\u2610"),
        ("No identifying people or locations", "\u2610"),
        ("Consistent cat_0001-style naming, no duplicates", "\u2610"),
    ]
    for index, (left, right) in enumerate(checks):
        cells = checklist.rows[index].cells
        for col, value in enumerate((left, right)):
            cells[col].text = ""
            paragraph = cells[col].paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(1)
            run = paragraph.add_run(value)
            run.font.size = Pt(8.5)
            run.bold = index == 0
    for row in checklist.rows:
        row.cells[0].width = Inches(5.4)
        row.cells[1].width = Inches(1.2)

    heading(document, "9. If in doubt")
    body(
        document,
        "Leave the photo out and flag it. A smaller, verified set is worth far more than a large set with doubtful "
        "licensing or unclear parts - and rejecting one photo costs nothing, while a bad label is trained in permanently.",
        size=9.5,
    )

    document.save(DOC_PATH)
    print("saved", DOC_PATH)


if __name__ == "__main__":
    build()

