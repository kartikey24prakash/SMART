import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { registerParticipant } from "../services/authService";

const inputBase =
  "w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 text-sm placeholder-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200";

const labelBase =
  "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

const GENDERS = ["male", "female", "other"];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    contactNumber: "",
    institution: "",
    studentId: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!/^\d{10}$/.test(form.contactNumber)) {
      e.contactNumber = "Enter a valid 10-digit mobile number.";
    }
    if (!form.institution.trim()) e.institution = "Institute name is required.";
    if (!form.studentId.trim()) e.studentId = "Student ID is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Enter a valid email address.";
    }
    if (form.password.length < 6) {
      e.password = "Password must be at least 6 characters.";
    }
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = "Passwords do not match.";
    }
    if (!form.gender) e.gender = "Please select a gender.";
    return e;
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);

    try {
      await registerParticipant({
        name: form.name,
        email: form.email,
        password: form.password,
        gender: form.gender,
        institution: form.institution,
        studentId: form.studentId,
        contactNumber: form.contactNumber,
      });
      setSuccess(true);
      setTimeout(() => navigate("/participant", { replace: true }), 1200);
    } catch (err) {
      setErrors({
        form:
          err.response?.data?.message || "Registration failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-slate-800 text-xl font-bold mb-2">
            Registration Successful
          </h2>
          <p className="text-slate-500 text-sm">
            Your participant account is ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-10">
      <div className="fixed top-0 right-0 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-50 pointer-events-none translate-y-1/2 -translate-x-1/2" />

      <div className="relative w-full max-w-lg">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden">
          <div className="h-1.5 w-full bg-linear-to-r from-blue-500 via-indigo-500 to-violet-500" />

          <div className="px-8 pt-8 pb-10">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200">
                <span className="text-white text-xs font-bold">SEM</span>
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                  SMART Event Manager
                </p>
                <h1 className="text-slate-800 text-xl font-bold leading-tight">
                  Participant Registration
                </h1>
              </div>
            </div>

            {errors.form && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-500 text-sm">
                {errors.form}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelBase}>Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="e.g. Rahul Sharma"
                  className={`${inputBase} ${errors.name ? "border-red-300" : ""}`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelBase}>Mobile Number</label>
                  <input
                    type="tel"
                    value={form.contactNumber}
                    onChange={handleChange("contactNumber")}
                    placeholder="9876543210"
                    maxLength={10}
                    className={`${inputBase} ${errors.contactNumber ? "border-red-300" : ""}`}
                  />
                  {errors.contactNumber && (
                    <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>
                  )}
                </div>

                <div>
                  <label className={labelBase}>Student ID</label>
                  <input
                    type="text"
                    value={form.studentId}
                    onChange={handleChange("studentId")}
                    placeholder="e.g. 23MCA101"
                    className={`${inputBase} ${errors.studentId ? "border-red-300" : ""}`}
                  />
                  {errors.studentId && (
                    <p className="text-red-500 text-xs mt-1">{errors.studentId}</p>
                  )}
                </div>
              </div>

              <div>
                <label className={labelBase}>Institute / College Name</label>
                <input
                  type="text"
                  value={form.institution}
                  onChange={handleChange("institution")}
                  placeholder="e.g. SMS Varanasi"
                  className={`${inputBase} ${errors.institution ? "border-red-300" : ""}`}
                />
                {errors.institution && (
                  <p className="text-red-500 text-xs mt-1">{errors.institution}</p>
                )}
              </div>

              <div>
                <label className={labelBase}>Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  placeholder="rahul@example.com"
                  className={`${inputBase} ${errors.email ? "border-red-300" : ""}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className={labelBase}>Gender</label>
                <div className="flex gap-3">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setForm((p) => ({ ...p, gender: g }));
                        setErrors((p) => ({ ...p, gender: undefined }));
                      }}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        form.gender === g
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-500"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelBase}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange("password")}
                      placeholder="Min 6 chars"
                      className={`${inputBase} pr-14 ${errors.password ? "border-red-300" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 text-xs font-semibold transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className={labelBase}>Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={handleChange("confirmPassword")}
                      placeholder="Re-enter password"
                      className={`${inputBase} pr-14 ${errors.confirmPassword ? "border-red-300" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 text-xs font-semibold transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-400 text-white font-bold text-sm py-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-blue-300 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? "Creating your account..." : "Create Participant Account"}
              </button>

              <p className="text-center text-slate-400 text-sm pt-1">
                Already registered?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  Login here
                </Link>
              </p>
            </form>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-5">
          SMART Event Manager - SMS Varanasi - Tech Marathon 12
        </p>
      </div>
    </div>
  );
}
