export function getUserId() {
  if (typeof window === "undefined") return null;
  let userId = localStorage.getItem("interview_user_id");
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("interview_user_id", userId);
  }
  return userId;
}