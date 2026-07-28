import os
import uuid
import datetime
from typing import Dict, Any, Tuple
from utils.logger import logger
from services.ocr.ocr_factory import get_ocr_provider

class OCRService:
    ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf"}
    MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

    def validate_file(self, filename: str, file_size: int) -> Tuple[bool, str]:
        ext = os.path.splitext(filename.lower())[1]
        if ext not in self.ALLOWED_EXTENSIONS:
            return False, f"Unsupported format '{ext}'. Allowed: PNG, JPG, JPEG, PDF"
        if file_size > self.MAX_FILE_SIZE_BYTES:
            return False, f"File size ({file_size / (1024*1024):.1f} MB) exceeds maximum limit of 20 MB"
        return True, "Valid file"

    def save_physical_file(self, file_bytes: bytes, filename: str) -> str:
        """
        Saves uploaded receipt file to backend/uploads/receipts/YYYY/MM/<uuid>_<filename>.
        MongoDB stores relative file path only.
        """
        now = datetime.datetime.now()
        year_str = now.strftime("%Y")
        month_str = now.strftime("%m")
        
        base_dir = os.path.join("uploads", "receipts", year_str, month_str)
        os.makedirs(base_dir, exist_ok=True)
        
        unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
        full_path = os.path.join(base_dir, unique_name)
        
        with open(full_path, "wb") as f:
            f.write(file_bytes)
            
        relative_url = f"/uploads/receipts/{year_str}/{month_str}/{unique_name}".replace("\\", "/")
        logger.info(f"Saved physical receipt file to '{full_path}'")
        return relative_url

    async def process_receipt(self, file_bytes: bytes, filename: str, provider_name: str = None) -> Dict[str, Any]:
        """
        Delegates OCR extraction to the selected OCR Provider driver (Tesseract, Google Doc AI, Azure).
        """
        relative_url = self.save_physical_file(file_bytes, filename) if file_bytes and len(file_bytes) > 0 else f"/uploads/{filename}"
        ocr_driver = get_ocr_provider(provider_name)
        
        extracted_result = await ocr_driver.extract_receipt_data(file_bytes, filename)
        
        return {
            "status": "completed",
            "filename": filename,
            "receipt_url": relative_url,
            "ocr_provider": extracted_result.get("provider", "FinanceOS OCR Engine"),
            "overall_confidence": extracted_result.get("overall_confidence", 0.95),
            "ocr_data": extracted_result.get("ocr_data", {})
        }

ocr_service = OCRService()
