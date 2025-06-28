"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/AuthContext";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, needsPasswordChange, completePasswordChange } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await completePasswordChange(newPassword);
    } catch (err: any) {
      setError(err.message || "Password change failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (needsPasswordChange) {
    return (
      <form onSubmit={handlePasswordChange} className="mt-8 space-y-6">
        {error && (
          <div className="bg-red-50 p-4 rounded text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="bg-green-50 p-4 rounded text-[#688055] text-sm">
          Hi there, this must be your first time logging in. Sorry for the
          inconvenience, but we need you to set a new password for your account.
          Please enter your new password below.
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700"
          >
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-[#a8cd89]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-md text-white bg-[#A8CD89] hover:bg-[#A8CD89] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#a8cd89] disabled:opacity-50 font-bold"
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="bg-red-50 p-4 rounded text-red-500 text-sm">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          type="text"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-[#a8cd89]"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-[#a8cd89]"
        />
      </div>

      <div className="">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-md text-white bg-[#A8CD89] hover:bg-[#A8CD89] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#a8cd89] disabled:opacity-50 font-bold"
        >
          {isLoading ? "Signing in..." : "IAM TEA"}
        </button>
      </div>
    </form>
  );
}
