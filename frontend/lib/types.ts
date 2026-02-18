export interface User {
  id: number;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  secondary_contact_name: string | null;
  secondary_contact_phone: string | null;
  secondary_contact_relation: string | null;
  consent_accepted: boolean;
  is_admin: boolean;
  consent_date?: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Pet {
  id: number;
  owner_id: number;
  name: string;
  species: string;
  breed: string | null;
  dob: string | null;
  sex: string | null;
  weight_log: WeightEntry[] | null;
  microchip_num: string | null;
  insurance: string | null;
  image_url: string | null;
  created_at: string;
}

export interface WeightEntry {
  date: string;
  weight_kg: number;
}

export interface Medication {
  id: number;
  pet_id: number;
  drug_name: string;
  strength: string | null;
  directions: string | null;
  indication: string | null;
  start_date: string | null;
  stop_date: string | null;
  prescriber: string | null;
  pharmacy: string | null;
  is_active: boolean;
  document_id: number | null;
  refill_reminder_date: string | null;
  created_at: string;
}

export interface Vaccine {
  id: number;
  pet_id: number;
  name: string;
  date_given: string | null;
  clinic: string | null;
  lot_number: string | null;
  next_due_date: string | null;
  document_id: number | null;
  created_at: string;
}

export interface Problem {
  id: number;
  pet_id: number;
  condition_name: string;
  is_active: boolean;
  onset_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface Allergy {
  id: number;
  pet_id: number;
  allergy_type: "Drug" | "Food" | "Environmental" | "Vaccine";
  substance_name: string;
  reaction_desc: string | null;
  severity: "Mild" | "Moderate" | "Severe" | null;
  date_noticed: string | null;
  vet_verified: boolean;
  document_id: number | null;
  created_at: string;
}

export interface Document {
  id: number;
  pet_id: number;
  filename: string;
  upload_date: string;
  extraction_status: "pending" | "processing" | "completed" | "failed";
  extracted_data: Record<string, unknown> | null;
}

export interface EmergencyShare {
  token: string;
  url: string;
  qr_code?: string;
  expires_at: string;
  access_type: string;
}

export interface AllergyBrief {
  id: number;
  substance_name: string;
  allergy_type: string;
  severity: string | null;
  reaction_desc: string | null;
}

export interface MedicationCreateResponse {
  medication: Medication;
  allergy_warnings: AllergyBrief[];
}

/* ── Labs ─────────────────────────────────────────────── */
export type LabType = "chemistry" | "electrolytes" | "cbc" | "nsaid_screen" | "urinalysis" | "thyroid" | "other";

export const LAB_TYPE_LABELS: Record<LabType, string> = {
  chemistry: "Chemistry Panel",
  electrolytes: "Electrolytes",
  cbc: "CBC (Complete Blood Count)",
  nsaid_screen: "NSAID Screen",
  urinalysis: "Urinalysis",
  thyroid: "Thyroid Panel",
  other: "Other",
};

export interface LabTemplateField {
  key: string;
  label: string;
  unit: string;
}

export const LAB_TEMPLATES: Record<string, LabTemplateField[]> = {
  chemistry: [
    { key: "bun", label: "BUN", unit: "mg/dL" },
    { key: "creatinine", label: "Creatinine", unit: "mg/dL" },
    { key: "alt", label: "ALT (SGPT)", unit: "U/L" },
    { key: "ast", label: "AST (SGOT)", unit: "U/L" },
    { key: "alp", label: "ALP", unit: "U/L" },
    { key: "total_protein", label: "Total Protein", unit: "g/dL" },
    { key: "albumin", label: "Albumin", unit: "g/dL" },
    { key: "globulin", label: "Globulin", unit: "g/dL" },
    { key: "glucose", label: "Glucose", unit: "mg/dL" },
    { key: "bilirubin", label: "Total Bilirubin", unit: "mg/dL" },
    { key: "cholesterol", label: "Cholesterol", unit: "mg/dL" },
    { key: "amylase", label: "Amylase", unit: "U/L" },
    { key: "lipase", label: "Lipase", unit: "U/L" },
  ],
  electrolytes: [
    { key: "sodium", label: "Sodium (Na)", unit: "mEq/L" },
    { key: "potassium", label: "Potassium (K)", unit: "mEq/L" },
    { key: "chloride", label: "Chloride (Cl)", unit: "mEq/L" },
    { key: "calcium", label: "Calcium (Ca)", unit: "mg/dL" },
    { key: "phosphorus", label: "Phosphorus", unit: "mg/dL" },
    { key: "magnesium", label: "Magnesium", unit: "mg/dL" },
    { key: "bicarbonate", label: "Bicarbonate (HCO3)", unit: "mEq/L" },
  ],
  cbc: [
    { key: "wbc", label: "WBC", unit: "×10³/µL" },
    { key: "rbc", label: "RBC", unit: "×10⁶/µL" },
    { key: "hemoglobin", label: "Hemoglobin", unit: "g/dL" },
    { key: "hematocrit", label: "Hematocrit", unit: "%" },
    { key: "platelets", label: "Platelets", unit: "×10³/µL" },
    { key: "neutrophils", label: "Neutrophils", unit: "×10³/µL" },
    { key: "lymphocytes", label: "Lymphocytes", unit: "×10³/µL" },
    { key: "monocytes", label: "Monocytes", unit: "×10³/µL" },
    { key: "eosinophils", label: "Eosinophils", unit: "×10³/µL" },
    { key: "basophils", label: "Basophils", unit: "×10³/µL" },
    { key: "mcv", label: "MCV", unit: "fL" },
    { key: "mch", label: "MCH", unit: "pg" },
    { key: "mchc", label: "MCHC", unit: "g/dL" },
  ],
  nsaid_screen: [
    { key: "bun", label: "BUN", unit: "mg/dL" },
    { key: "creatinine", label: "Creatinine", unit: "mg/dL" },
    { key: "alt", label: "ALT (SGPT)", unit: "U/L" },
    { key: "alp", label: "ALP", unit: "U/L" },
    { key: "total_protein", label: "Total Protein", unit: "g/dL" },
    { key: "urine_specific_gravity", label: "Urine Specific Gravity", unit: "" },
    { key: "urine_protein", label: "Urine Protein", unit: "" },
  ],
  urinalysis: [
    { key: "specific_gravity", label: "Specific Gravity", unit: "" },
    { key: "ph", label: "pH", unit: "" },
    { key: "protein", label: "Protein", unit: "" },
    { key: "glucose", label: "Glucose", unit: "" },
    { key: "ketones", label: "Ketones", unit: "" },
    { key: "bilirubin", label: "Bilirubin", unit: "" },
    { key: "blood", label: "Blood / Hemoglobin", unit: "" },
    { key: "wbc", label: "WBC", unit: "/hpf" },
    { key: "rbc", label: "RBC", unit: "/hpf" },
    { key: "bacteria", label: "Bacteria", unit: "" },
    { key: "crystals", label: "Crystals", unit: "" },
    { key: "casts", label: "Casts", unit: "/lpf" },
  ],
  thyroid: [
    { key: "t4", label: "Total T4", unit: "µg/dL" },
    { key: "free_t4", label: "Free T4", unit: "ng/dL" },
    { key: "tsh", label: "TSH", unit: "ng/mL" },
  ],
};

export interface Lab {
  id: number;
  pet_id: number;
  lab_type: LabType;
  lab_date: string | null;
  veterinarian: string | null;
  clinic: string | null;
  results: Record<string, string> | null;
  notes: string | null;
  document_id: number | null;
  created_at: string;
}

/* ── Insurance ────────────────────────────────────────── */
export type CoverageType = "accident" | "illness" | "wellness" | "comprehensive";

export const COVERAGE_TYPE_LABELS: Record<CoverageType, string> = {
  accident: "Accident Only",
  illness: "Illness Only",
  wellness: "Wellness / Preventive",
  comprehensive: "Comprehensive",
};

export interface Insurance {
  id: number;
  pet_id: number;
  has_insurance: boolean;
  provider_name: string | null;
  policy_number: string | null;
  group_number: string | null;
  phone: string | null;
  coverage_type: string | null;
  deductible: number | null;
  co_pay_percent: number | null;
  annual_limit: number | null;
  effective_date: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/* ── Common Medications Reference ─────────────────────── */
export interface CommonMedication {
  id: number;
  drug_name: string;
  drug_class: string;
  species: string[];
  common_indications: string;
  typical_dose: string;
  route: string;
  common_side_effects: string[];
  warnings: string;
}

/* ── Appointments ─────────────────────────────────────── */
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export interface AppointmentVetBrief {
  id: number;
  clinic_name: string;
  veterinarian_name: string | null;
  phone: string | null;
}

export interface Appointment {
  id: number;
  pet_id: number;
  vet_provider_id: number | null;
  title: string;
  appointment_date: string;
  clinic: string | null;
  veterinarian: string | null;
  reason: string | null;
  notes: string | null;
  status: AppointmentStatus;
  vet_provider: AppointmentVetBrief | null;
  created_at: string;
}

/* ── Vitals ───────────────────────────────────────────── */
export interface Vital {
  id: number;
  pet_id: number;
  recorded_date: string;
  weight_kg: number | null;
  weight_lbs: number | null;
  temperature_f: number | null;
  heart_rate_bpm: number | null;
  respiratory_rate: number | null;
  notes: string | null;
  created_at: string;
}

/* ── Vet Providers ────────────────────────────────────── */
export interface VetProvider {
  id: number;
  owner_id: number;
  clinic_name: string;
  veterinarian_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  specialty: string | null;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
}

/* ── Vet Clinic Reference (MA Lookup) ─────────────────── */
export interface VetClinicRef {
  id: number;
  clinic_name: string;
  veterinarian_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip_code: string | null;
  website: string | null;
  specialty: string | null;
  services: string | null;
  is_emergency: boolean;
}

/* ── Activity Notes ───────────────────────────────────── */
export type NoteCategory = "general" | "behavior" | "diet" | "symptom" | "exercise";

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  general: "General",
  behavior: "Behavior",
  diet: "Diet",
  symptom: "Symptom",
  exercise: "Exercise",
};

export interface ActivityNote {
  id: number;
  pet_id: number;
  note_date: string;
  category: NoteCategory;
  title: string;
  body: string | null;
  created_at: string;
}

/* ── Dashboard Summary ────────────────────────────────── */
export interface DashboardSummary {
  overdue_vaccines: { id: number; pet_id: number; pet_name: string; name: string; next_due_date: string }[];
  upcoming_vaccines: { id: number; pet_id: number; pet_name: string; name: string; next_due_date: string }[];
  refill_reminders: { id: number; pet_id: number; pet_name: string; drug_name: string; refill_reminder_date: string }[];
  upcoming_appointments: { id: number; pet_id: number; pet_name: string; title: string; appointment_date: string }[];
}
