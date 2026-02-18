"""
Local PDF parser for vet visit summaries.

Extracts medications, vaccines, vitals, problems, and allergies
from common vet visit summary formats (Bond Vet, VEG, generic).
Falls back gracefully when sections are not found.
"""

import re
from datetime import datetime
from pathlib import Path

import pdfplumber


def extract_visit_data(file_path: str) -> dict:
    """Extract structured medical data from a vet visit summary PDF."""
    pdf = pdfplumber.open(file_path)
    full_text = ""
    for page in pdf.pages:
        text = page.extract_text()
        if text:
            full_text += text + "\n"
    pdf.close()

    if not full_text.strip():
        return {"error": "Could not extract text from PDF"}

    # Detect visit date
    visit_date = _extract_visit_date(full_text)

    # Detect clinic info
    clinic = _extract_clinic(full_text)

    # Detect provider
    provider = _extract_provider(full_text)

    result = {
        "medications": _extract_medications(full_text, provider),
        "vaccines": _extract_vaccines(full_text, visit_date, clinic),
        "vitals": _extract_vitals(full_text, visit_date),
        "problems": _extract_problems(full_text),
        "allergies": _extract_allergies(full_text),
        "pet_info": _extract_pet_info(full_text),
    }

    return result


def _extract_visit_date(text: str) -> str | None:
    """Extract visit date from text."""
    # "Date Generated: Feb 09, 2026"
    m = re.search(r"Date Generated:\s*(\w+\s+\d{1,2},?\s+\d{4})", text)
    if m:
        return _parse_date_str(m.group(1))

    # "Visit Date: December 19, 2025"
    m = re.search(r"Visit Date:\s*(\w+\s+\d{1,2},?\s+\d{4})", text)
    if m:
        return _parse_date_str(m.group(1))

    # "February 9, 2026 at 12:55 pm"
    m = re.search(r"(\w+\s+\d{1,2},?\s+\d{4})\s+at\s+\d", text)
    if m:
        return _parse_date_str(m.group(1))

    return None


def _parse_date_str(date_str: str) -> str | None:
    """Parse various date formats to YYYY-MM-DD."""
    date_str = date_str.strip().replace(",", "")
    for fmt in ["%B %d %Y", "%b %d %Y", "%m/%d/%Y", "%m/%d/%y"]:
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _extract_clinic(text: str) -> str | None:
    """Extract clinic/hospital name."""
    # Bond Vet pattern
    if "bondvet.com" in text.lower() or "bond vet" in text.lower():
        m = re.search(r"(Bond Vet\s*[-–]\s*\w+)", text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
        # Try from location
        m = re.search(r"SOMERVILLE|Somerville|somerville", text)
        if m:
            return "Bond Vet - Somerville"
        return "Bond Vet"

    # VEG pattern
    if "veg.com" in text.lower() or "veterinary emergency group" in text.lower() or "VEG" in text:
        m = re.search(r"VEG\s*[-–]?\s*(\w+)", text)
        if m and m.group(1) not in ("Medical", "Tx", "Discharge"):
            return f"VEG - {m.group(1)}"
        m = re.search(r"Veterinary Emergency Group\s*(?:of\s+)?(\w+)", text, re.IGNORECASE)
        if m:
            return f"VEG - {m.group(1)}"
        return "VEG"

    return None


def _extract_provider(text: str) -> str | None:
    """Extract provider/doctor name."""
    m = re.search(r"Provider:\s*(Dr\.\s*[\w\s]+?)(?:\s*\(|$|\n)", text)
    if m:
        return m.group(1).strip()

    m = re.search(r"(Dr\.\s*[\w]+\s+[\w\s]+?)(?:\n|Peabody|Somerville|$)", text)
    if m:
        name = m.group(1).strip()
        # Clean trailing words that aren't part of the name
        name = re.sub(r"\s+(Peabody|Somerville|Visit|Discharge).*", "", name)
        return name

    return None


def _extract_medications(text: str, provider: str | None = None) -> list[dict]:
    """Extract medications from the text."""
    meds = []

    # --- Bond Vet style: "Parasite Preventive Medications" section ---
    parasitic_match = re.search(
        r"Parasite Preventive Medications\s*\n(.+?)(?:\nMedications/Supplements|\n[A-Z]{2,})",
        text, re.DOTALL
    )
    if parasitic_match:
        block = parasitic_match.group(1).strip()
        for line in block.split("\n"):
            line = line.strip()
            if line and not line.startswith("Medications") and len(line) > 3:
                # Extract strength in parens
                strength_m = re.search(r"\((.+?)\)", line)
                drug = re.sub(r"\s*\(.+?\)", "", line).strip()
                if drug:
                    meds.append({
                        "drug_name": drug,
                        "strength": strength_m.group(1) if strength_m else None,
                        "directions": "Per label - parasite preventive",
                        "indication": "Parasite prevention",
                        "start_date": None,
                        "stop_date": None,
                        "prescriber": provider,
                        "pharmacy": None,
                        "confidence": 0.9,
                    })

    # --- Bond Vet style: "Medications/Supplements" section ---
    supp_match = re.search(
        r"Medications/Supplements.*?\n(.+?)(?:\nKnown Allergies|\nCurrent Diet|\nOWNER|\n[A-Z]{3,}\n)",
        text, re.DOTALL
    )
    if supp_match:
        block = supp_match.group(1).strip()
        # Check for "Medications: No" - skip if no active meds
        if not re.match(r"Medications:\s*No\b", block):
            # Try to find supplement names  
            supp_lines = block.split("\n")
            current_supp = None
            details = []
            for line in supp_lines:
                line = line.strip()
                if not line or line.startswith("Medications: No"):
                    continue
                # Lines with colons followed by content are detail lines
                if re.match(r"^(Hip|Skin|Heart|Immune|Cognitive|Liver|Urinary|Digestive)", line):
                    details.append(line)
                elif "Supplement" in line or "in 1" in line or "Multi" in line:
                    current_supp = line
                elif len(line) > 10 and ":" in line:
                    details.append(line)

            if current_supp:
                indication = "; ".join(details) if details else None
                meds.append({
                    "drug_name": current_supp,
                    "strength": None,
                    "directions": "Per label",
                    "indication": indication,
                    "start_date": None,
                    "stop_date": None,
                    "prescriber": None,
                    "pharmacy": None,
                    "confidence": 0.85,
                })

    # --- VEG style: "MEDICATIONS" section ---
    med_match = re.search(
        r"MEDICATIONS\s+(.+?)(?:\nHOME CARE|\nMONITORING|\nTREATMENT|\n[A-Z]{3,}\s+[A-Z])",
        text, re.DOTALL
    )
    if med_match:
        block = med_match.group(1).strip()
        # Parse medication entries: "Drug Name DOSE ROUTE"
        # e.g., "Proviable Forte Kit 30 mL TGH"
        lines = block.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue
            # Skip lines that are just directions
            if line.startswith("Give ") or line.startswith("Total Qty") or line.startswith("Next Dose"):
                i += 1
                continue

            # This might be a medication name line
            drug_name = line
            directions = None
            strength = None

            # Check next lines for directions
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if next_line.startswith("Give "):
                    directions = next_line
                    i += 1

            # Extract strength from drug name if present
            str_m = re.search(r"(\d+\s*(?:mg|mL|mcg|IU|units?)(?:/\w+)?)", drug_name, re.IGNORECASE)
            if str_m:
                strength = str_m.group(1)

            if drug_name and not drug_name.startswith("Total") and not drug_name.startswith("Next"):
                meds.append({
                    "drug_name": drug_name,
                    "strength": strength,
                    "directions": directions,
                    "indication": None,
                    "start_date": None,
                    "stop_date": None,
                    "prescriber": provider,
                    "pharmacy": None,
                    "confidence": 0.85,
                })
            i += 1

    # --- VEG style: HOME CARE medications ---
    home_care_match = re.search(
        r"HOME CARE.*?MONITORING[:\s]*(.+?)(?:\nThank you|\nSincerely|\nVEG\s*\|)",
        text, re.DOTALL
    )
    if not home_care_match:
        home_care_match = re.search(
            r"HOME CARE.*?\n(.+?)(?:\nThank you|\nSincerely)",
            text, re.DOTALL
        )

    if home_care_match:
        block = home_care_match.group(1).strip()
        # Find numbered medications: "1. Drug Name"
        numbered = re.findall(r"\d+\.\s+(.+?)(?:\n|$)", block)
        for med_line in numbered:
            med_line = med_line.strip()
            # Skip if it's a description continuation
            if med_line.startswith("This is") or med_line.startswith("We recommend") or len(med_line) < 3:
                continue
            # Check if we already have this med
            drug_name = med_line.split("(")[0].strip()
            if not any(m["drug_name"].lower().startswith(drug_name.lower()[:10]) for m in meds):
                meds.append({
                    "drug_name": drug_name,
                    "strength": None,
                    "directions": None,
                    "indication": "Recommended for home care",
                    "start_date": None,
                    "stop_date": None,
                    "prescriber": provider,
                    "pharmacy": "OTC",
                    "confidence": 0.8,
                })

    return meds


def _extract_vaccines(text: str, visit_date: str | None, clinic: str | None) -> list[dict]:
    """Extract vaccines from the text."""
    vaccines = []

    # Bond Vet style: IMMUNIZATIONS table
    imm_match = re.search(r"IMMUNIZATIONS\s*\n(.+?)(?:\nOTHER PRODUCTS|\nPLAN|\n[A-Z]{3,}\s)", text, re.DOTALL)
    if imm_match:
        block = imm_match.group(1).strip()
        # Skip header line that has TYPE DETAILS etc
        lines = [l for l in block.split("\n") if l.strip() and not re.match(r"TYPE\s+DETAILS", l.strip())]

        # Parse vaccine entries - they span multiple lines
        i = 0
        current_vaccine = None
        while i < len(lines):
            line = lines[i].strip()
            # Skip provider lines
            if line.startswith("Provider:"):
                i += 1
                continue

            # Check if this is a vaccine name line (contains "Vaccine" or known vaccine names)
            if any(v in line for v in ["Vaccine", "Leptospirosis", "Lyme", "Influenza", "Bordetella",
                                        "Rabies", "DAPP", "DHPP", "FVRCP", "FeLV"]):
                # Extract manufacturer
                mfg_match = re.search(r"Manufacturer:\s*(\w+)", line)
                # Extract date
                date_match = re.search(r"(\w{3}\s+\d{2},?\s+\d{4})", line)

                # Clean the vaccine name
                name = line
                # Remove manufacturer info
                name = re.sub(r"Manufacturer:.*", "", name).strip()
                # Remove date info
                name = re.sub(r"\w{3}\s+\d{2},?\s+\d{4}", "", name).strip()

                if current_vaccine and name and not name.startswith("Provider"):
                    # This is a new vaccine, save the previous one
                    vaccines.append(current_vaccine)

                if name and not name.startswith("Provider"):
                    vax_date = _parse_date_str(date_match.group(1)) if date_match else visit_date
                    current_vaccine = {
                        "name": name,
                        "date_given": vax_date,
                        "clinic": clinic,
                        "lot_number": None,
                        "next_due_date": None,
                        "confidence": 0.9,
                    }
            elif current_vaccine and re.search(r"(H3N[28]|Bivalent)", line):
                # Continuation of vaccine name
                current_vaccine["name"] += " " + line.strip()
                current_vaccine["name"] = re.sub(r"Manufacturer:.*", "", current_vaccine["name"]).strip()
                current_vaccine["name"] = re.sub(r"\w{3}\s+\d{2},?\s+\d{4}", "", current_vaccine["name"]).strip()

            i += 1

        if current_vaccine:
            vaccines.append(current_vaccine)

    # Clean up vaccine names
    for v in vaccines:
        v["name"] = re.sub(r"\s+", " ", v["name"]).strip()
        # Remove trailing dates or extra text
        v["name"] = re.sub(r"\s*\d{4}$", "", v["name"]).strip()
        # Remove "Provider: ..." 
        v["name"] = re.sub(r"\s*Provider:.*", "", v["name"]).strip()

    return vaccines


def _extract_vitals(text: str, visit_date: str | None) -> list[dict]:
    """Extract vitals (weight, heart rate, temp, etc.) from text."""
    vitals_data = {
        "recorded_date": visit_date,
        "weight_kg": None,
        "weight_lbs": None,
        "temperature_f": None,
        "heart_rate_bpm": None,
        "respiratory_rate": None,
        "notes": [],
        "confidence": 0.9,
    }

    found_any = False

    # Weight in kg
    m = re.search(r"Weight\s+(\d+\.?\d*)\s*kg", text, re.IGNORECASE)
    if m:
        vitals_data["weight_kg"] = float(m.group(1))
        vitals_data["weight_lbs"] = round(float(m.group(1)) * 2.20462, 1)
        found_any = True

    # Weight in lbs
    if not vitals_data["weight_kg"]:
        m = re.search(r"Weight\s+(\d+\.?\d*)\s*(?:lbs?|pounds?)", text, re.IGNORECASE)
        if m:
            vitals_data["weight_lbs"] = float(m.group(1))
            vitals_data["weight_kg"] = round(float(m.group(1)) / 2.20462, 1)
            found_any = True

    # Also check "31.7 kg" pattern in pet info line
    if not vitals_data["weight_kg"]:
        m = re.search(r"(\d+\.?\d*)\s*kg\b", text)
        if m:
            vitals_data["weight_kg"] = float(m.group(1))
            vitals_data["weight_lbs"] = round(float(m.group(1)) * 2.20462, 1)
            found_any = True

    # Heart rate
    m = re.search(r"Heart Rate\s+(\d+)\s*(?:bpm|BPM)", text, re.IGNORECASE)
    if m:
        vitals_data["heart_rate_bpm"] = int(m.group(1))
        found_any = True

    # Respiratory rate
    m = re.search(r"Respiratory Rate\s+(\d+)\s*(?:bpm|BPM)?", text, re.IGNORECASE)
    if m:
        val = m.group(1)
        if val.isdigit() and int(val) < 200:  # Sanity check
            vitals_data["respiratory_rate"] = int(val)
            found_any = True

    # Temperature
    m = re.search(r"Temperature\s+(\d+\.?\d*)\s*°?F", text, re.IGNORECASE)
    if m:
        vitals_data["temperature_f"] = float(m.group(1))
        found_any = True

    # BCS
    bcs_m = re.search(r"BCS\s+(\d+)[/\s]*(?:\(?\d+-?\d*\)?|/\d+)", text)
    if bcs_m:
        vitals_data["notes"].append(f"BCS: {bcs_m.group(0).strip()}")

    # Mucous Membranes
    mm_m = re.search(r"Mucous Membrane[s]?\s+(\w+)", text, re.IGNORECASE)
    if mm_m:
        vitals_data["notes"].append(f"Mucous Membranes: {mm_m.group(1)}")

    # CRT
    crt_m = re.search(r"(?:CRT|Capillary Refill Time)\s+([<>]?\d+\s*(?:sec|Seconds?)?)", text, re.IGNORECASE)
    if crt_m:
        vitals_data["notes"].append(f"CRT: {crt_m.group(1).strip()}")

    # Mentation/Attitude
    att_m = re.search(r"(?:Attitude|Mentation)\s+(\w+)", text, re.IGNORECASE)
    if att_m:
        vitals_data["notes"].append(f"Attitude: {att_m.group(1)}")

    if not found_any:
        return []

    vitals_data["notes"] = ". ".join(vitals_data["notes"]) if vitals_data["notes"] else None

    return [vitals_data]


def _extract_problems(text: str) -> list[dict]:
    """Extract problems/conditions from text."""
    problems = []

    # Bond Vet: "PROBLEMS LIST" section
    prob_match = re.search(r"PROBLEMS LIST\s*\n(.+?)(?:\nORDERS|\nIMMUNIZATIONS|\nPLAN)", text, re.DOTALL)
    if prob_match:
        block = prob_match.group(1).strip()
        for line in block.split("\n"):
            line = line.strip()
            if not line:
                continue
            # "Lameness - May 24, 2025"
            date_m = re.search(r"(.+?)\s*[-–]\s*(\w+\s+\d{1,2},?\s+\d{4})", line)
            if date_m:
                problems.append({
                    "condition_name": date_m.group(1).strip(),
                    "onset_date": _parse_date_str(date_m.group(2)),
                    "is_active": True,
                    "notes": None,
                    "confidence": 0.9,
                })
            elif len(line) > 2:
                problems.append({
                    "condition_name": line,
                    "onset_date": None,
                    "is_active": True,
                    "notes": None,
                    "confidence": 0.8,
                })

    # VEG: "PROBLEMS AND DIFFERENTIALS" section
    veg_prob = re.search(
        r"PROBLEMS\s+(?:AND\s+)?(?:PROBLEMS\s+)?DIFFERENTIALS\s*\n(.+?)(?:\nNOTES|\nTREATMENT|\n[A-Z]{3,}\s)",
        text, re.DOTALL
    )
    if veg_prob:
        block = veg_prob.group(1).strip()
        lines = block.split("\n")
        for line in lines:
            line = line.strip()
            if not line or line == "DIFFERENTIALS":
                continue
            # Check if this is a problem (short line) vs differential list (long line with commas)
            if "," not in line and len(line) < 50:
                if not any(p["condition_name"].lower() == line.lower() for p in problems):
                    problems.append({
                        "condition_name": line,
                        "onset_date": None,
                        "is_active": True,
                        "notes": None,
                        "confidence": 0.85,
                    })

    # VEG: "PRESENTING COMPLAINTS" 
    pc_match = re.search(r"PRESENTING\s+COMPLAINTS?\s*\n?(.+?)(?:\nHISTORY|\nVITALS|\n[A-Z]{3,})", text, re.DOTALL)
    if pc_match:
        complaint = pc_match.group(1).strip()
        if complaint and len(complaint) < 100:
            if not any(p["condition_name"].lower() == complaint.lower() for p in problems):
                problems.append({
                    "condition_name": complaint,
                    "onset_date": None,
                    "is_active": True,
                    "notes": "Presenting complaint",
                    "confidence": 0.85,
                })

    return problems


def _extract_allergies(text: str) -> list[dict]:
    """Extract allergies from text."""
    allergies = []

    # Check for "No reported allergies" or "Allergies: None Recorded"
    if re.search(r"(?:No reported allergies|Allergies:\s*None|No known allergies)", text, re.IGNORECASE):
        return []

    # "Known Allergies:" section
    allergy_match = re.search(r"(?:Known )?Allergies[:\s]+(.+?)(?:\nCurrent Diet|\n[A-Z]{2,})", text, re.DOTALL)
    if allergy_match:
        block = allergy_match.group(1).strip()
        if "none" in block.lower() or "no reported" in block.lower():
            return []

        for line in block.split("\n"):
            line = line.strip()
            if line and "none" not in line.lower() and len(line) > 2:
                allergies.append({
                    "substance_name": line,
                    "allergy_type": "Drug",
                    "reaction_desc": None,
                    "severity": None,
                    "confidence": 0.7,
                })

    return allergies


def _extract_pet_info(text: str) -> dict:
    """Extract pet identification info."""
    info = {
        "name": None,
        "species": None,
        "breed": None,
        "weight": None,
        "confidence": 0.9,
    }

    # "Patient: Hugo"
    m = re.search(r"Patient:\s*(\w+)", text)
    if m:
        info["name"] = m.group(1)

    # Species from "Canine" or "Dog" or "Cat" or "Feline"
    if re.search(r"\bCanine\b|\bDog\b", text, re.IGNORECASE):
        info["species"] = "Dog"
    elif re.search(r"\bFeline\b|\bCat\b", text, re.IGNORECASE):
        info["species"] = "Cat"

    # Breed
    m = re.search(r"Breed:\s*(.+?)(?:\n|$|\|)", text)
    if m:
        info["breed"] = m.group(1).strip()
    else:
        # "Australian Cattle Dog Mix"
        m = re.search(r"([\w\s]+(?:Mix|Breed|Terrier|Retriever|Shepherd|Poodle|Bulldog)[\w\s]*)", text)
        if m:
            breed = m.group(1).strip()
            if len(breed) < 60:
                info["breed"] = breed

    # Weight
    m = re.search(r"(\d+\.?\d*)\s*kg", text, re.IGNORECASE)
    if m:
        info["weight"] = f"{m.group(1)} kg"

    return info
