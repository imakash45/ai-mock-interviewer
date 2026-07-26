"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  "Data Analyst", "Data Scientist", "Software Engineer", "Backend Developer",
  "Frontend Developer", "Full Stack Developer", "DevOps Engineer", "ML Engineer",
  "AI Engineer", "QA Engineer", "Cloud Engineer", "Cybersecurity Analyst",
  "Product Manager", "Business Analyst", "Marketing Manager", "Sales Executive",
  "HR Manager", "Financial Analyst", "Operations Manager", "Content Strategist",
];

const INTERVIEW_TYPES = ["Technical", "Behavioral", "Mixed"];

export default function Home() {
  const [role, setRole] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const router = useRouter();

  const canStart = role && interviewType;

  const handleStart = () => {
    router.push(`/interview?role=${encodeURIComponent(role)}&type=${interviewType}`);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen py-10 sm:py-16 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => router.push("/history")}
            className="text-sm text-gray-400 hover:text-gray-200 transition cursor-pointer"
          >
            View History →
          </button>
        </div>
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-5">
            <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v3m-3 0h6M12 15a4 4 0 004-4V5a4 4 0 10-8 0v6a4 4 0 004 4z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight mb-2">
            AI Interview Prep Simulator
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Practice with a voice-based AI interviewer tailored to your role.
          </p>
        </div>

        <div className="bg-gray-900/60 backdrop-blur border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl shadow-black/20">
          <div>
            <label className="block text-sm mb-2 text-gray-100 font-semibold">Target role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-sm sm:text-base text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
            >
              <option value="" className="bg-gray-900 text-gray-100">Select a role</option>
              {ROLES.map((r) => (
                <option key={r} value={r} className="bg-gray-900 text-gray-100">{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-100 font-semibold">Interview type</label>
            <div className="grid grid-cols-3 gap-2">
              {INTERVIEW_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setInterviewType(t)}
                  className={`py-2.5 rounded-xl text-sm sm:text-base font-medium border transition cursor-pointer ${
                    interviewType === t
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-950/50"
                      : "bg-gray-950 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-gray-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full py-3 rounded-xl bg-indigo-600 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold transition hover:bg-indigo-500 disabled:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-indigo-950/40"
          >
            Start Interview
          </button>

          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-950/60 border border-gray-800 rounded-lg px-3 py-2.5">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>For the best experience, use headphones or earphones — this prevents the interviewer's voice from being picked up by your microphone.</span>
          </div>
        </div>
      </div>
    </main>
  );
}