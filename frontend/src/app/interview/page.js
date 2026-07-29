"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getUserId } from "@/lib/identity";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
const TOTAL_QUESTIONS = 5;

function InterviewScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get("role");
  const interviewType = searchParams.get("type");

  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [status, setStatus] = useState("loading");
  const [history, setHistory] = useState([]);
  const [isFollowUpQuestion, setIsFollowUpQuestion] = useState(false);

  const recognitionRef = useRef(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!role || !interviewType) {
      router.push("/");
      return;
    }
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    createSession();
  }, []);

  const createSession = async () => {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: getUserId(), role, interview_type: interviewType }),
    });
    const data = await res.json();
    setSessionId(data.id);
    fetchNextQuestion(data.id);
  };

  const fetchNextQuestion = async (sid) => {
    setStatus("loading");
    setIsFollowUpQuestion(false);
    const res = await fetch(`${API_BASE}/sessions/${sid}/questions/next`, { method: "POST" });
    const data = await res.json();
    setQuestion(data);
    setQuestionCount((c) => c + 1);
    setStatus("ready");
    speakQuestion(data.question);
  };

  const speakQuestion = (text) => {
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;

    const applyVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find((v) => v.name === "Microsoft Ravi - English (India)");
      if (indianVoice) {
        utterance.voice = indianVoice;
      }
      utterance.onend = () => {
        setTimeout(() => setIsSpeaking(false), 600);
      };
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = applyVoiceAndSpeak;
    } else {
      applyVoiceAndSpeak();
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      setTranscript(finalText);
      setInterimTranscript(interimText);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      if (recognitionRef.current === recognition && recognitionRef.current.shouldContinue) {
        recognition.start();
      } else {
        setIsListening(false);
      }
    };
    recognition.shouldContinue = true;
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.shouldContinue = false;
    }
    try {
      recognitionRef.current?.stop();
    } catch (e) {}
    setIsListening(false);
    setTranscript((prev) => prev + interimTranscript);
    setInterimTranscript("");
  };

  const skipQuestion = async () => {
    window.speechSynthesis.cancel();
    setStatus("scoring");
    const res = await fetch(`${API_BASE}/questions/${question.id}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer_text: "", is_follow_up: isFollowUpQuestion }),
    });
    const data = await res.json();

    setHistory((prev) => [
      ...prev,
      {
        number: questionCount,
        category: question.category,
        question: question.question,
        answer: "",
        scores: data.scores,
        feedback: "Skipped by candidate.",
        isFollowUp: isFollowUpQuestion,
        skipped: true,
      },
    ]);
    setTranscript("");
    setInterimTranscript("");

    if (questionCount >= TOTAL_QUESTIONS) {
      setStatus("done");
    } else {
      fetchNextQuestion(sessionId);
    }
  };

  const endInterviewEarly = () => {
    if (history.length === 0) {
      alert("Answer at least one question before ending the interview.");
      return;
    }
    window.speechSynthesis.cancel();
    router.push(`/report?sessionId=${sessionId}`);
  };

  const submitAnswer = async () => {
    setStatus("scoring");
    const submittedAnswer = transcript;
    const submittedQuestion = question;
    const submittedNumber = questionCount;
    const wasFollowUp = isFollowUpQuestion;

    const res = await fetch(`${API_BASE}/questions/${question.id}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer_text: submittedAnswer, is_follow_up: wasFollowUp }),
    });
    const data = await res.json();

    setHistory((prev) => [
      ...prev,
      {
        number: submittedNumber,
        category: submittedQuestion.category,
        question: submittedQuestion.question,
        answer: submittedAnswer,
        scores: data.scores,
        feedback: data.feedback,
        isFollowUp: wasFollowUp,
      },
    ]);

    setTranscript("");
    setInterimTranscript("");

    if (data.follow_up_needed && !wasFollowUp) {
      setQuestion({ ...question, question: data.follow_up_question });
      setIsFollowUpQuestion(true);
      speakQuestion(data.follow_up_question);
      setStatus("ready");
    } else if (questionCount >= TOTAL_QUESTIONS) {
      setStatus("done");
    } else {
      setTimeout(() => fetchNextQuestion(sessionId), 2500);
    }
  };




  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 px-4 text-center gap-2">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin mb-2"></div>
        <p>Starting your interview...</p>
        <p className="text-xs text-gray-600">This can take up to a minute on the first request.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-8 sm:py-12 px-2 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-900/60 backdrop-blur border border-gray-800 rounded-2xl px-4 sm:px-6 py-4 mb-6 shadow-xl shadow-black/20">
          <div className="flex justify-between items-center text-xs sm:text-sm mb-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1 text-gray-300 hover:text-gray-100 transition cursor-pointer font-medium"
            >
              ← Back
            </button>
            <span className="font-semibold text-gray-100">{role} · {interviewType}</span>
            <span className="bg-indigo-600/20 border border-indigo-500/30 px-2.5 py-1 rounded-full text-indigo-300 font-semibold">
              {questionCount} / {TOTAL_QUESTIONS}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-950/60 border border-gray-800 rounded-lg px-3 py-2.5">
            <svg className="w-3.5 h-3.5 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Use headphones for the clearest results — it stops your mic from picking up the interviewer's voice.</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/2">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6 mb-6">
              <p className="text-xs text-indigo-400 mb-2">{question.category}</p>
              <p className="text-base sm:text-lg text-gray-100">{question.question}</p>
              {isSpeaking && <p className="text-xs text-gray-500 mt-2">Speaking...</p>}
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6 min-h-[100px] mb-4 text-sm sm:text-base">
              <span className="text-gray-100">{transcript}</span>
              <span className="text-gray-500">{interimTranscript}</span>
              {!transcript && !interimTranscript && (
                <span className="text-gray-600">
                  {isListening ? "Listening..." : "Your spoken answer will appear here..."}
                </span>
              )}
            </div>

            <div className="flex gap-3 flex-col sm:flex-row mb-3">
              <button
                onClick={() => speakQuestion(question.question)}
                disabled={isSpeaking || isListening}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-700 bg-gray-900 text-gray-100 hover:border-gray-500 hover:bg-gray-800 transition cursor-pointer disabled:cursor-not-allowed disabled:text-gray-600"
              >
                Repeat Question
              </button>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row mb-3">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={status !== "ready" || isSpeaking}
                className={`flex-1 py-3 rounded-lg font-medium transition cursor-pointer disabled:cursor-not-allowed ${
                  isListening ? "bg-red-600 hover:bg-red-500" : "bg-indigo-600 hover:bg-indigo-500"
                } disabled:bg-gray-800 disabled:text-gray-500`}
              >
                {isListening ? "Stop Recording" : "Start Recording"}
              </button>
              <button
                onClick={submitAnswer}
                disabled={!transcript || isListening || status !== "ready"}
                className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 font-medium transition cursor-pointer disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row">
              <button
                onClick={skipQuestion}
                disabled={status !== "ready" || isSpeaking || isListening}
                className="flex-1 py-2 rounded-lg text-sm border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 transition cursor-pointer disabled:cursor-not-allowed disabled:text-gray-700"
              >
                Skip Question
              </button>
              <button
                onClick={endInterviewEarly}
                disabled={isListening}
                className="flex-1 py-2 rounded-lg text-sm border border-red-900/50 text-red-400 hover:border-red-700 hover:text-red-300 transition cursor-pointer disabled:cursor-not-allowed disabled:text-gray-700"
              >
                End Interview
              </button>
            </div>

            {status === "done" && (
              <button
                onClick={() => router.push(`/report?sessionId=${sessionId}`)}
                className="w-full mt-3 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-gray-100 font-medium transition cursor-pointer"
              >
                View Report
              </button>
            )}
          </div>

          <div className="w-full md:w-1/2">
            <h2 className="text-sm font-semibold text-gray-100 mb-3 tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              Session History
            </h2>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {history.length === 0 && (
                <p className="text-sm text-gray-500">Answered questions will appear here as you go.</p>
              )}
              {history.map((h, idx) => (
                <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-indigo-400">
                      {h.isFollowUp ? "Follow-up" : `Q${h.number}`} · {h.category}
                    </span>
                  </div>
                  <p className="text-gray-100 mb-2">{h.question}</p>
                  <p className="text-gray-300 mb-2 italic">"{h.answer || "(no answer given)"}"</p>
                  <p className="text-gray-400 mb-2">{h.feedback}</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(h.scores).map(([k, v]) => (
                      <span key={k} className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-100">
                        {k}: {v}/5
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <InterviewScreen />
    </Suspense>
  );
}