# MedPetRx – Product Planning Document (Claude Code Build Spec)

## Version 1.0

Founder: Cohan Houniet, PharmD
Platform Type: Web + Mobile Application
Primary Users: Pet Owners
Secondary Users: Licensed Veterinary Providers

---

# 1. Vision

MedPetRx is a centralized veterinary medical record hub designed to unify pet health data across emergency rooms, general practices, urgent care, and specialty clinics.

In veterinary ER medicine, life-or-death decisions are often made with incomplete records. MedPetRx solves this by:

* Creating a portable, owner-controlled medical record
* Enabling instant emergency summaries
* Supporting drug–drug interaction screening
* Structuring uploaded documents automatically using AI
* Generating de-identified research datasets (optional consent)

---

# 2. Core Differentiator: AI Medical Record Structuring

## Problem

Pet owners upload PDFs, discharge notes, vaccine records, lab results, handwritten notes, etc.
These are unstructured and hard to quickly interpret in emergencies.

## Solution

Like resume-scanning job platforms:

> When an owner uploads a document, MedPetRx automatically scans, extracts, classifies, and organizes data into structured medical fields.

---

# 3. AI Document Ingestion Engine

## Feature Name:

**Smart Medical Record Parser (SMRP)**

## Supported Upload Types

* PDF
* JPG / PNG images
* Scanned handwritten documents
* Discharge notes
* Lab reports
* Vaccine certificates
* Prescription labels

---

## AI Processing Pipeline

### Step 1: OCR Layer

* Extract raw text from scanned or image documents.

### Step 2: NLP Medical Extraction

Extract and classify into structured schema:

| Extracted Data Type                   | Destination Module  |
| ------------------------------------- | ------------------- |
| Medication names                      | Medications tab     |
| Strength + directions                 | Medication fields   |
| Start/stop dates                      | Medication timeline |
| Diagnoses (CKD, IVDD, seizures, etc.) | Problems list       |
| Vaccines                              | Vaccine module      |
| Allergies / ADRs                      | Allergy module      |
| Lab values                            | Records timeline    |
| Surgery history                       | Visit timeline      |
| Weight values                         | Weight tracker      |

### Step 3: Confidence Scoring

Each extracted field gets:

* Confidence %
* “Review & Confirm” screen for owner validation

### Step 4: Owner Review Screen

Before final save:

* Highlight extracted items
* Allow edit / approve / reject

---

# 4. Data Schema (Structured Medical Model)

## Pet Profile

* Name
* Species
* Breed
* DOB / Age
* Sex
* Weight (trend log)
* Microchip #
* Insurance (optional)

---

## Medications

* Drug name
* Strength
* Directions (SIG)
* Indication
* Start date
* Stop date
* Prescriber
* Pharmacy/Vet
* Active / Past toggle
* Attach document
* Refill reminder

---

## Vaccines

* Vaccine name
* Date given
* Clinic
* Lot number
* Next due date
* Document attachment

---

## Problems List

* Condition name
* Active / Resolved
* Onset date
* Notes
* Linked meds/labs

---

## Allergies / ADR Module

Fields:

* Allergy type (Drug / Food / Environmental / Vaccine)
* Substance name
* Reaction description
* Severity (Mild / Moderate / Severe)
* Date noticed
* Vet verified? (Y/N)
* Supporting document

Auto Alert:
If added medication matches allergy → warning pop-up.

---

## Medical Records Timeline

Chronological list:

* Visit type
* Diagnostics
* Imaging
* Surgery
* Labs
* Discharge notes
* Upload documents

---

# 5. Drug–Drug Interaction (DDI) Engine

Location: Medications → Interaction Checker

### Functionality

* Auto-pulls active meds
* Toggle: Include supplements?
* Run interaction analysis
* Categorize:

  * Severe
  * Moderate
  * Minor

Interaction card shows:

* Drug A + Drug B
* Mechanism
* Clinical risk
* Monitoring recommendation
* Export/share option

Disclaimer aligned with Terms:
Informational only. Not medical advice.

---

# 6. Emergency Mode (Competitive Advantage)

## Emergency Summary Card

Displays:

* Active medications
* Severe interactions flagged
* Allergies (color coded)
* Active problems
* Recent labs
* Emergency contact
* Vet contact

---

## Emergency Access Methods

* Time-limited share link
* QR code
* One-time passcode
* Microchip lookup (if enabled)

All access logged in audit log.

---

# 7. User Roles

## A) Pet Owner (Primary)

* Creates account
* Uploads records
* Controls sharing
* Approves AI extracted data
* Enables/disables emergency mode
* Controls research consent

---

## B) Veterinary Provider (Verified)

Requirements:

* License verification
* DEA number submission
* Identity authentication

Capabilities:

* View authorized records
* Push updates via API (future)
* Access emergency summary (if enabled)

All access logged.

---

# 8. Security & Compliance Framework

Aligned with uploaded Terms document.

## Required Consent (Gate Before Use)

User must agree to:

* Storage of Pet Data
* Not a veterinary provider
* Sharing revocable at any time

---

## Optional Consent

* De-identified data use
* Aggregated research analytics

---

## Security Measures

* Encryption at rest
* Encryption in transit
* MFA option
* Role-based access control
* Audit logs
* Data separation between Owner Data and Pet Data

---

# 9. Privacy Architecture

Pet Data stored separately from:

* Owner name
* Email
* Phone

Emergency microchip lookup returns:

* Only emergency summary
* Not full owner profile

---

# 10. Owner Portal Navigation

Main Tabs:

* Home
* Records
* Medications
* Vaccines
* Profile
* Problems
* Allergies
* Settings

---

# 11. Home Dashboard

Displays:

* Medication reminders
* Vaccine due alerts
* Recently uploaded records
* Emergency summary access
* Quick add buttons

---

# 12. Settings

* Password
* MFA toggle
* Privacy controls
* Sharing controls
* Consent management
* Export records (PDF)
* Delete account
* Access log

---

# 13. AI Infrastructure (Claude Code Build Planning)

## Backend

* Node.js or Python (FastAPI)
* PostgreSQL
* Secure object storage (documents)

## AI Layer

* OCR engine
* LLM extraction model
* Medical entity recognition
* Confidence scoring engine
* Structured JSON output schema

Example extraction output:

```json
{
  "medications": [
    {
      "name": "Prednisone",
      "strength": "5 mg",
      "directions": "1 tablet twice daily",
      "indication": "Atopy",
      "start_date": "2025-02-01"
    }
  ],
  "problems": ["Atopy"],
  "allergies": []
}
```

---

# 14. Phase 1 Build Scope (MVP)

Must Have:

* Account creation
* Pet profile
* Manual medication entry
* Document upload
* AI extraction + review
* Emergency summary
* Allergy module
* DDI checker (basic version)
* Consent gating
* Audit logging

---

# 15. Phase 2

* Veterinary portal
* Practice management integrations
* Insurance API integration
* Advanced analytics dashboard
* Research data engine
* Pharma partnerships

---

# 16. Long-Term Vision

MedPetRx becomes:

* The “universal passport” for veterinary medicine
* The largest de-identified veterinary dataset
* A pharmacovigilance safety monitoring platform
* A cost-optimization tool for clinics
* A research partner for veterinary pharma

---

# 17. Key Risks

* Data privacy concerns
* Veterinary adoption resistance
* AI extraction errors
* Legal/regulatory classification
* Liability misinterpretation

Mitigation:

* Clear disclaimers
* Owner validation before save
* Audit trails
* Optional research consent

---

# 18. Success Metrics

* % of uploads successfully structured
* Emergency share usage rate
* Medication adherence engagement
* Vet adoption rate
* Reduction in ER intake time
* Research dataset growth (opt-in only)

---

# 19. Strategic Positioning

Human healthcare has:

* Epic
* MyChart
* Unified EHR systems

Veterinary medicine does not.

MedPetRx fills that gap.
