"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserId } from "@/lib/identity";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const userId = getUserId();
      const res = await fetch(`${API_BASE}/sessions?user_id=${userId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions(data);
    } catch (e) {
      setError("Could not load your interview history.");
    }
  };

  return (
    <main className="min-h-screen py-8 sm:py-12 px-2 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-gray-300 hover:text-gray-100 transition cursor-pointer text-sm font-medium"
          >
            ← Back
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-100">Your Interview History</h1>
          <span className="w-10" />
        </div>

        {error && <p className="text-red-400 text-center">{error}</p>}

        {!sessions && !error && (
          <p className="text-gray-400 text-center">Loading...</p>
        )}

        {sessions && sessions.length === 0 && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 text-center">
            <p className="text-gray-400">No interviews yet. Start your first one from the home page.</p>
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/report?sessionId=${s.id}`)}
                disabled={s.status !== "completed"}
                className="w-full text-left bg-gray-900/60 border border-gray-800 rounded-xl p-4 sm:p-5 hover:border-gray-600 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex justify-between items-center"
              >
                <div>
                  <p className="text-gray-100 font-semibold">{s.role}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {s.status === "completed" ? "Completed" : "In progress"}
                  </p>
                </div>
                {s.overall_score != null && (
                  <span className="bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 rounded-full text-indigo-300 font-semibold text-sm">
                    {s.overall_score} / 5
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}