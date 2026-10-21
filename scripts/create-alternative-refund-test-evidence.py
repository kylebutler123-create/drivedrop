"""Produce explicitly simulated evidence for QA21 ALT; never real bank proof."""
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

target = Path(__file__).resolve().parents[1] / 'docs/evidence/qa21-alt-simulated-repayment.pdf'
styles = getSampleStyleSheet()
pdfmetrics.registerFont(TTFont('QASans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('QASansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
styles['Title'].fontName = 'QASansBold'
styles['BodyText'].fontName = 'QASans'
styles.add(ParagraphStyle(name='Warning', fontName='QASansBold', fontSize=14, leading=20,
                         textColor=colors.HexColor('#9B2226'), spaceAfter=18))
styles['BodyText'].leading = 16
doc = SimpleDocTemplate(str(target), pagesize=A4, rightMargin=46, leftMargin=46,
                        topMargin=48, bottomMargin=48, title='QA21 ALT - simulated repayment evidence',
                        author='DriveDrop sandbox verification')
story = [Paragraph('SIMULATED REPAYMENT', styles['Title']), Spacer(1, 12),
         Paragraph('SANDBOX TEST ONLY - NOT BANK EVIDENCE', styles['Warning']),
         Paragraph('This is manufactured test data for the approved DriveDrop preview verification. '
                   'It does not confirm any real payment, bank transfer, cleared cheque or receipt of funds.', styles['BodyText']),
         Spacer(1, 22)]
rows = [
    ('Test case', 'QA21 ALT'),
    ('Environment', 'DriveDrop preview / Stripe sandbox'),
    ('Simulated amount', 'GBP 1.10'),
    ('Simulated method', 'Other completed repayment'),
    ('Test reference', 'SIMULATED-DD-ALT-20261021-A'),
    ('Simulated settlement date', '21 October 2026'),
    ('Booking ID', 'cmvibep670001jn08afdvank7'),
    ('Payment ID', 'cmvibep670002jn088ghnin68'),
    ('Stripe test refund', 're_3UT2C5LAzgkvCvrI0RqwMRET'),
]
table = Table([[Paragraph(a, styles['BodyText']), Paragraph(b, styles['BodyText'])] for a,b in rows],
              colWidths=[158, 345], hAlign='LEFT')
table.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'TOP'), ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#EEF2F7')),
    ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
    ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ('TOPPADDING', (0,0), (-1,-1), 9), ('BOTTOMPADDING', (0,0), (-1,-1), 9),
]))
story += [table, Spacer(1, 24),
          Paragraph('For this test only, the synthetic customer is treated as having received GBP 1.10. '
                    'The administrator form records that simulated outcome and preserves the failed Stripe refund history. '
                    'No real-world repayment is represented.', styles['BodyText']), Spacer(1, 20),
          Paragraph('DO NOT USE AS PROOF OF PAYMENT', styles['Warning'])]
doc.build(story)
print(target)
