import { useState } from "react";
import { useLoginMutation } from "../api/authApi.js";

export const Login = () => {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [login, { isLoading }] = useLoginMutation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await login({ identifier: employeeNumber, password }).unwrap();
    } catch (submitError) {
      const message = submitError?.data?.message || submitError?.message || "Unable to sign in.";
      setError(message);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
      padding: "24px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        padding: "32px 28px",
        borderRadius: 18,
        background: "#ffffff",
        boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: "#4b5563", fontWeight: 700 }}>Waypoint Cargo</div>
          <h1 style={{ margin: "10px 0 8px", fontSize: 32, color: "#111827" }}>Store Manager Sign in</h1>
          <p style={{ margin: 0, color: "#6b7280" }}>Use your employee credentials to access the orders dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
          <label style={{ display: "grid", gap: 8, fontWeight: 600, color: "#374151" }}>
            Employee number
            <input
              type="text"
              value={employeeNumber}
              onChange={(event) => setEmployeeNumber(event.target.value.trim())}
              placeholder="Enter your employee number"
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 15,
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 8, fontWeight: 600, color: "#374151" }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 15,
                outline: "none",
              }}
            />
          </label>

          {error && (
            <div style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              border: "none",
              borderRadius: 12,
              background: "#2563eb",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 15,
              padding: "12px 18px",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
