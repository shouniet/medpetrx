# MedPetRx

A full-stack veterinary medical records management application for pet owners. Track medications, vaccines, lab results, appointments, vitals, and more — all in one place.

## Features

### Authentication & User Management
- **Registration & Login** — Email/password auth with JWT tokens (HS256, 60-min expiry)
- **Consent Flow** — Users must accept terms before accessing records
- **Owner Profile** — First/last name, address, secondary contact / co-owner
- **Admin System** — Admin users can manage all users, pets, medications, and common medication references

### Pet Profiles
- **Pet CRUD** — Add, edit, and delete pets with name, species, breed, date of birth, sex, microchip number
- **Multi-pet Support** — Manage unlimited pets per account

### Medications
- **Medication CRUD** — Track drug name, strength, directions, indication, prescriber, pharmacy, active status
- **Common Medications Pick-list** — Searchable reference of 33+ common pet medications; pre-fills the add form
- **Refill Reminders** — Set refill reminder dates; surfaced on the dashboard when due
- **Allergy Cross-check** — Automatic warning when adding a medication that matches a recorded allergy

### Vaccines
- **Vaccine CRUD** — Record vaccine name, date given, clinic, lot number, next due date
- **Overdue & Upcoming Alerts** — Dashboard cards highlight overdue and soon-due vaccines

### Lab Results
- **7 Lab Types** — Chemistry Panel, Electrolytes, CBC, NSAID Screen, Urinalysis, Thyroid Panel, Other
- **Structured Templates** — Each lab type has pre-defined result fields with units
- **Expandable Cards** — Collapsed summary view that expands to full results

### Allergies
- **Allergy CRUD** — Drug, Food, Environmental, and Vaccine allergy types
- **Severity Levels** — Mild, Moderate, Severe
- **Vet Verification** — Flag allergies as vet-verified

### Problems / Conditions
- **Problem List** — Track active and resolved conditions with onset dates and notes

### Insurance
- **Insurance Tracking** — Toggle insurance on/off per pet
- **Policy Details** — Provider, policy/group number, phone, coverage type, deductible, co-pay %, annual limit, effective/expiration dates

### Appointments
- **Appointment CRUD** — Title, date/time, clinic, veterinarian, reason, notes
- **Status Management** — Scheduled, Completed, Cancelled with filter buttons
- **Upcoming vs Past** — Automatic grouping into upcoming and past sections
- **Dashboard Integration** — Upcoming appointments appear on summary cards

### Weight & Vitals History
- **Vitals Recording** — Weight (auto-converts between lbs ↔ kg), temperature (°F), heart rate (bpm), respiratory rate
- **Weight Trend Chart** — SVG line chart showing weight over time
- **Temperature Alerts** — High temperatures highlighted in red (>103°F)

### Activity / Notes Log
- **Note CRUD** — Timestamped entries with title and body
- **5 Categories** — General, Behavior, Diet, Symptom, Exercise
- **Category Filter** — Filter notes by category with color-coded badges
- **Timeline View** — Reverse-chronological activity feed

### Vet Provider Directory
- **Provider CRUD** — Clinic name, veterinarian, phone, email, address, website, specialty
- **Primary Vet Flag** — Mark one provider as primary (shown with star badge)
- **Contact Links** — Clickable phone, email, and website links
- **User-scoped** — Providers belong to the owner, shared across all pets

### Dashboard
- **Pet Overview Cards** — Quick links to each pet's records
- **Summary Alert Cards** — Color-coded cards for:
  - 🔴 Overdue vaccines
  - 🟡 Vaccines due within 30 days
  - 🟣 Medication refills needed
  - 🔵 Upcoming appointments
- **Export Button** — Download a pet's full medical record as a text file

### Drug Interaction Checker
- **Per-pet Check** — Scans a pet's active medications against OpenFDA data
- **Multi-pet Check** — "Check All Pets" scans medications across the entire household
- **Interaction Results** — Shows found interactions with source citations
- **Disclaimer** — Notes that data is from the human drug database

### Emergency QR Share
- **Shareable Link** — Generate time-limited emergency access to a pet's records
- **QR Code** — Scannable QR code for quick sharing with vets or emergency contacts

### Document Management
- **File Upload** — Upload medical documents (PDFs, images)
- **AI Extraction** — Anthropic-powered extraction of medical data from uploaded documents
- **Extraction Review** — Review and approve extracted data before saving

### Common Medications Guide
- **Browsable Reference** — 33+ common pet medications with drug class, indications, dosing, side effects, warnings
- **Search & Filter** — Filter by name, species (dog/cat), or drug class
- **Admin CRUD** — Admins can add, edit, and delete reference medications

### Admin Panel
- **User Management** — View and delete users
- **Pet Management** — View all pets across all users
- **Medication Overview** — View all medications
- **Common Meds Management** — Full CRUD on the common medications reference database

### Audit Logging
- **Action Tracking** — All significant actions (logins, CRUD operations, DDI checks) are logged with user ID, action type, resource, and IP address

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Framework | FastAPI 0.115 |
| Language | Python 3.12 |
| Database | PostgreSQL (asyncpg) |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Auth | python-jose (JWT), passlib (bcrypt) |
| AI | Anthropic Claude (document extraction) |
| QR Codes | qrcode + Pillow |
| Drug Data | OpenFDA API (httpx) |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14.2 |
| Language | TypeScript |
| Styling | TailwindCSS 3.4 |
| State/Fetching | TanStack React Query 5 |
| HTTP Client | Axios |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Notifications | react-hot-toast |
| Date Utilities | date-fns |

## Project Structure

```
petapp/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── config.py         # Settings (env vars)
│   │   ├── database.py       # Async SQLAlchemy engine/session
│   │   ├── dependencies.py   # Auth & consent dependencies
│   │   ├── models/           # SQLAlchemy models (14 models)
│   │   ├── routers/          # API route handlers (20 routers)
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── services/         # Business logic (auth, DDI, extraction, etc.)
│   ├── uploads/              # Uploaded documents
│   ├── requirements.txt
│   └── alembic.ini
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   │   ├── dashboard/        # Dashboard with summary cards
│   │   ├── pets/             # Pet list + per-pet tabbed views
│   │   ├── admin/            # Admin panel
│   │   ├── ddi/              # Drug interaction checker
│   │   ├── vet-providers/    # Vet provider directory
│   │   ├── medications-guide/# Common medications reference
│   │   └── settings/         # User settings
│   ├── components/           # Shared components (Sidebar, etc.)
│   ├── lib/
│   │   ├── api.ts            # Axios instance with auth interceptor
│   │   └── types.ts          # TypeScript interfaces
│   ├── package.json
│   └── next.config.mjs       # API proxy rewrites
└── .gitignore
```

## Getting Started

### Prerequisites
- **Python 3.12+**
- **Node.js 18+**
- **PostgreSQL 14+**

### Database Setup

```sql
CREATE USER medpetrx_user WITH PASSWORD 'medpetrx123';
CREATE DATABASE medpetrx OWNER medpetrx_user;
```

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Create .env from example
cp .env.example .env
# Edit .env with your database URL and secret key

# Run migrations
alembic upgrade head

# (Optional) Seed admin user and common medications
python seed_admin.py
python -m app.seed_common_meds

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:3000
```

### Environment Variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://medpetrx_user:medpetrx123@localhost:5432/medpetrx
SECRET_KEY=your-256-bit-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## API Overview

The backend exposes a RESTful API at `http://localhost:8000`. Full interactive docs are available at `/docs` (Swagger UI).

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Pets | `GET/POST /pets`, `GET/PUT/DELETE /pets/{id}` |
| Medications | `GET/POST /pets/{id}/medications`, `PUT/DELETE .../medications/{mid}` |
| Vaccines | `GET/POST /pets/{id}/vaccines`, `DELETE .../vaccines/{vid}` |
| Labs | `GET/POST /pets/{id}/labs`, `PUT/DELETE .../labs/{lid}` |
| Allergies | `GET/POST /pets/{id}/allergies`, `DELETE .../allergies/{aid}` |
| Problems | `GET/POST /pets/{id}/problems`, `PUT/DELETE .../problems/{pid}` |
| Insurance | `GET/PUT /pets/{id}/insurance` |
| Appointments | `GET/POST /pets/{id}/appointments`, `PUT/DELETE .../appointments/{aid}` |
| Vitals | `GET/POST /pets/{id}/vitals`, `PUT/DELETE .../vitals/{vid}` |
| Notes | `GET/POST /pets/{id}/notes`, `PUT/DELETE .../notes/{nid}` |
| Vet Providers | `GET/POST /vet-providers`, `PUT/DELETE /vet-providers/{id}` |
| Dashboard | `GET /dashboard/summary` |
| Export | `GET /pets/{id}/export/pdf` |
| DDI | `POST /pets/{id}/medications/check-interactions`, `POST /medications/check-interactions-all-pets` |
| Emergency | `POST /pets/{id}/emergency-share`, `GET /emergency/{token}` |
| Documents | `POST /pets/{id}/documents`, `GET .../documents/{did}` |
| Common Meds | `GET /common-medications` |
| Admin | `GET /admin/users`, `GET /admin/pets`, `DELETE /admin/users/{id}`, CRUD `/admin/common-medications` |

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@medpetrx.com | admin1 |

## License

Private — All rights reserved.
