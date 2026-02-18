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
  "vitals": [
    {
      "recorded_date": "YYYY-MM-DD or null",
      "weight_kg": 0.0,
      "weight_lbs": 0.0,
      "temperature_f": 0.0,
      "heart_rate_bpm": 0,
      "respiratory_rate": 0,
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
- For vitals: convert weight to both kg and lbs if only one is provided (1 kg = 2.20462 lbs)
- Include BCS, mucous membrane color, CRT, and attitude in the vitals notes field
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
    """Background task: read document, extract data. Uses local PDF parser first, falls back to Claude."""
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

            suffix = file_path.suffix.lower()
            extracted = None

            # Try local PDF parser first (works without API key)
            if suffix == ".pdf":
                try:
                    from app.services.pdf_parser import extract_visit_data
                    extracted = extract_visit_data(str(file_path))
                    if extracted and not extracted.get("error"):
                        # Check if we actually found useful data
                        has_data = any([
                            extracted.get("medications"),
                            extracted.get("vaccines"),
                            extracted.get("vitals"),
                            extracted.get("problems"),
                            extracted.get("allergies"),
                        ])
                        if not has_data:
                            extracted = None  # Fall through to Claude
                except Exception:
                    extracted = None  # Fall through to Claude

            # Fall back to Claude API if local parser didn't produce results
            if extracted is None and settings.anthropic_api_key and not settings.anthropic_api_key.startswith("sk-ant-place"):
                file_bytes = file_path.read_bytes()
                b64_content = base64.standard_b64encode(file_bytes).decode("utf-8")
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

            if extracted and not extracted.get("error"):
                doc.extracted_data = extracted
                doc.extraction_status = ExtractionStatus.COMPLETED
            else:
                doc.extraction_status = ExtractionStatus.FAILED
                doc.extracted_data = extracted or {"error": "Could not extract data from document"}

        except Exception as e:
            doc.extraction_status = ExtractionStatus.FAILED
            doc.extracted_data = {"error": str(e)}

        await db.commit()
