"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

function ReportScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");

  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      router.push("/");
      return;
    }
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    generateReport();
  }, []);

  const generateReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/report`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Failed to generate report");
        return;
      }
      const data = await res.json();
      setReport(data);
    } catch (e) {
      setError("Could not reach the server.");
    }
  };

  if (error) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <p className="text-red-400 mb-4">{error}</p>
      <div className="flex gap-3">
        <button
          onClick={() => { setError(null); generateReport(); }}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-gray-100 cursor-pointer transition"
        >
          Retry
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 cursor-pointer transition"
        >
          Back to Home
        </button>
      </div>
    </main>
  );
}

    if (!report) {
    return (
      <main className="flex items-center justify-center min-h-screen text-gray-400">
        Generating your performance report...
      </main>
    );
  }

  return (
    <main className="min-h-screen py-8 sm:py-12 px-2">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-gray-200 transition cursor-pointer text-sm"
          >
            ← Back
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-500">Performance Report</h1>
          <span className="w-10" />
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6 text-center">
          <p className="text-sm text-gray-400 mb-1">Overall Score</p>
          <p className="text-4xl font-bold text-indigo-400">{report.overall_score} / 5</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-emerald-400 mb-2">Strengths</h2>
            <p className="text-gray-100 text-sm">{report.strengths}</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-red-400 mb-2">Weaknesses</h2>
            <p className="text-gray-100 text-sm">{report.weaknesses}</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-100 mb-4">Where You Could Improve</h2>
          <div className="space-y-4">
            {report.improved_answers?.map((item, idx) => (
              <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm">
                <p className="text-gray-100 mb-2 font-medium">{item.question}</p>
                <p className="text-gray-400 mb-1">
                  <span className="text-gray-500">Your answer: </span>
                  {item.original_answer}
                </p>
                <p className="text-emerald-300">
                  <span className="text-gray-500">Better answer: </span>
                  {item.better_answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6 mt-6">
          <h2 className="text-sm font-semibold text-gray-100 mb-4">Full Transcript</h2>
          <div className="space-y-4">
            {report.transcript?.map((t, idx) => (
              <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm">
                <p className="text-xs text-indigo-400 mb-1">
                  {t.is_follow_up ? "Follow-up" : `Q${t.number}`} · {t.category}
                </p>
                <p className="text-gray-100 mb-2">{t.question}</p>
                <p className="text-gray-300 mb-2 italic">"{t.answer || "(no answer given)"}"</p>
                {t.feedback && <p className="text-gray-400 mb-2">{t.feedback}</p>}
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(t.scores || {}).map(([k, v]) => (
                    <span key={k} className="text-xs bg-gray-900 px-2 py-1 rounded text-gray-100">
                      {k}: {v}/5
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full mt-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-gray-100 font-medium transition cursor-pointer"
        >
          Start New Interview
        </button>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ReportScreen />
    </Suspense>
  );
}