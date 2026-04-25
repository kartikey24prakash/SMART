import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { getCurrentUser, loginUser } from "../services/authService";

const getRedirectPath = (role) => {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "coordinator") {
    return "/coordinator";
  }

  return "/participant";
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { user } = await getCurrentUser();
        navigate(getRedirectPath(user.role), { replace: true });
      } catch {
        // No active session yet.
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const { user } = await loginUser({ email, password });
      navigate(getRedirectPath(user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-mono">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-200 opacity-50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="border border-slate-200 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
          <div className="h-1 w-full bg-linear-to-r from-violet-500 via-purple-500 to-indigo-500" />

          <div className="px-8 py-10">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-violet-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">SYS</span>
                </div>
                <span className="text-slate-400 text-xs tracking-widest uppercase">
                  System Access
                </span>
              </div>
              <h1 className="text-slate-800 text-2xl font-bold tracking-tight">
                Sign in
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Enter your credentials to continue
              </p>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-500 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-slate-500 text-xs tracking-widest uppercase block">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                    @
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-2.5 text-slate-800 text-sm placeholder-slate-300 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 text-xs tracking-widest uppercase block">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                    ***
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-10 py-2.5 text-slate-800 text-sm placeholder-slate-300 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition-colors text-xs"
                    tabIndex={-1}
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-500 hover:bg-violet-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm py-2.5 rounded-lg transition-all duration-200 tracking-widest uppercase flex items-center justify-center gap-2"
              >
                {loading ? "Authenticating..." : "Sign In"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-slate-300 text-xs tracking-widest">OR</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <p className="text-center text-slate-400 text-sm">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-violet-500 hover:text-violet-600 transition-colors font-semibold"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-300 text-xs mt-6 tracking-wide">
          Protected - Encrypted - Secure
        </p>
      </div>
    </div>
  );
}
