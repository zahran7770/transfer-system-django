import pytesseract
from PIL import Image
import re

# If on Windows, set the tesseract path:
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_amount(image_path: str):
    try:
        img  = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        nums = re.findall(r'[\d,]+\.?\d{0,2}', text)
        vals = [float(n.replace(',', '')) for n in nums if n]
        return max(vals) if vals else None
    except Exception:
        return None

def verify_amount(image_path: str, claimed: float, tolerance: float = 0.05):
    ocr_amount = extract_amount(image_path)
    if ocr_amount is None:
        return {'ocr_amount': None, 'match': None, 'message': 'Could not read receipt'}
    diff  = abs(ocr_amount - claimed) / claimed if claimed else 1
    match = diff <= tolerance
    return {
        'ocr_amount': ocr_amount,
        'match':      match,
        'message':    'Verified' if match else f'Mismatch: receipt shows {ocr_amount}'
    }