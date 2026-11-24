export type StoredTurn = {
  role: "user" | "assistant";
  text: string;
  at: string;
};

const CAP = 2000;

function clip(text: string): string {
  return text.trim().slice(0, CAP);
}

export function appendTurns(userText: string, assistantText: string, at: string): StoredTurn[] {
  const turns: StoredTurn[] = [];
  const question = clip(userText);
  const answer = clip(assistantText);
  if (question) turns.push({ role: "user", text: question, at });
  if (answer) turns.push({ role: "assistant", text: answer, at });
  return turns;
}
