"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/api";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip_code: "",
    secondary_contact_name: "",
    secondary_contact_phone: "",
    secondary_contact_relation: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
        secondary_contact_name: form.secondary_contact_name || null,
        secondary_contact_phone: form.secondary_contact_phone || null,
        secondary_contact_relation: form.secondary_contact_relation || null,
      });
      localStorage.setItem("access_token", data.access_token);
      router.push("/consent");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-700">MedPetRx</h1>
          <p className="text-gray-500 mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Primary Owner ────────────────────────────── */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Owner Information
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.first_name} onChange={set("first_name")} required className={inputCls} placeholder="Jane" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.last_name} onChange={set("last_name")} required className={inputCls} placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input type="email" value={form.email} onChange={set("email")} required className={inputCls} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={set("phone")} className={inputCls} placeholder="+1 (555) 000-0000" />
            </div>
          </fieldset>

          {/* ── Address ──────────────────────────────────── */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Address
            </legend>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input type="text" value={form.address_line1} onChange={set("address_line1")} className={inputCls} placeholder="123 Main St" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apt / Suite / Unit</label>
              <input type="text" value={form.address_line2} onChange={set("address_line2")} className={inputCls} placeholder="Apt 4B" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={form.city} onChange={set("city")} className={inputCls} placeholder="Springfield" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select value={form.state} onChange={set("state")} className={inputCls}>
                  <option value="">—</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input type="text" value={form.zip_code} onChange={set("zip_code")} className={inputCls} placeholder="62704" maxLength={10} />
              </div>
            </div>
          </fieldset>

          {/* ── Secondary Contact / Co-Owner ─────────────── */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Secondary Contact / Co-Owner <span className="text-gray-400 font-normal normal-case text-xs">(optional)</span>
            </legend>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={form.secondary_contact_name} onChange={set("secondary_contact_name")} className={inputCls} placeholder="John Doe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.secondary_contact_phone} onChange={set("secondary_contact_phone")} className={inputCls} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                <input type="text" value={form.secondary_contact_relation} onChange={set("secondary_contact_relation")} className={inputCls} placeholder="Spouse, Partner, etc." />
              </div>
            </div>
          </fieldset>

          {/* ── Password ─────────────────────────────────── */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Password
            </legend>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input type="password" value={form.password} onChange={set("password")} required minLength={8} className={inputCls} placeholder="At least 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input type="password" value={form.confirm_password} onChange={set("confirm_password")} required minLength={8} className={inputCls} placeholder="Re-enter password" />
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
