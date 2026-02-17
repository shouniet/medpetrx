import base64
import json
import re
from pathlib import Path

import anthropic

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.document import Document, ExtractionStatus

EXTRACTION_PROMPT = """
You are a veterinary medical record parser. Extract all medical information from this document.

Return a JSON object with EXACTLY this structure (omit empty arrays):
{
  "medications": [
    {
      "drug_name": "string",
      "strength": "string or null",
      "directions": "string or null",
      "indication": "string or null",
      "start_date": "YYYY-MM-DD or null",
      "stop_date": "YYYY-MM-DD or null",
      "prescriber": "string or null",
      "pharmacy": "string or null",
      "confidence": 0.0
    }
  ],
  "vaccines": [
    {
      "name": "string",
      "date_given": "YYYY-MM-DD or null",
      "clinic": "string or null",
      "lot_number": "string or null",
      "next_due_date": "YYYY-MM-DD or null",
      "confidence": 0.0
    }
  ],
  "allergies": [
    {
      "substance_name": "string",
      "allergy_type": "Drug|Food|Environmental|Vaccine",
      "reaction_desc": "string or null",
      "severity": "Mild|Moderate|Severe|null",
      "confidence": 0.0
    }
  ],
  "problems": [
    {
      "condition_name": "string",
      "onset_date": "YYYY-MM-DD or null",
      "is_active": true,
      "notes": "string or null",
      "confidence": 0.0
    }
  ],
  "pet_info": {
    "name": "string or null",
    "species": "string or null",
    "breed": "string or null",
    "weight": "string or null",
    "confidence": 0.0
  }
}

Rules:
- confidence is your certainty this data is correct (1.0 = certain, 0.5 = uncertain)
- For dates: use YYYY-MM-DD. If only year is known, use YYYY-01-01
- Return ONLY the JSON object, no other text or markdown
"""

MEDIA_TYPE_MAP = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


def _parse_claude_json(raw: str) -> dict:
    """Strip markdown code fences if present, then parse JSON."""
    raw = raw.strip()
    # Remove ```json ... ``` or ``` ... ```
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw.strip())


async def run_extraction(doc_id: int) -> None:
    """Background task: read document, call Claude, store extracted data."""
    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, doc_id)
        if not doc:
            return

        try:
            doc.extraction_status = ExtractionStatus.PROCESSING
            await db.commit()

            file_path = Path(doc.file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            file_bytes = file_path.read_bytes()
            b64_content = base64.standard_b64encode(file_bytes).decode("utf-8")

            suffix = file_path.suffix.lower()
            media_type = MEDIA_TYPE_MAP.get(suffix, "image/jpeg")

            if media_type == "application/pdf":
                content_block = {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": b64_content,
                    },
                }
            else:
                content_block = {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": b64_content,
                    },
                }

            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            message = await client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            content_block,
                            {"type": "text", "text": EXTRACTION_PROMPT},
                        ],
                    }
                ],
            )

            raw_response = message.content[0].text
            extracted = _parse_claude_json(raw_response)

            doc.extracted_data = extracted
            doc.extraction_status = ExtractionStatus.COMPLETED

        except Exception as e:
            doc.extraction_status = ExtractionStatus.FAILED
            doc.extracted_data = {"error": str(e)}

        await db.commit()
