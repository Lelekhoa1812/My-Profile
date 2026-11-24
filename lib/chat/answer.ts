export const SILENCE = "The record does not include that.";
export const UNREAD = "The record could not be read.";

type AnswerPart = { type: string; state?: string; output?: unknown };

export function keptSentence(outputs: readonly unknown[], modelText: string): string {
  return displayAnswer(
    outputs.map((output) => ({ type: "tool-output", state: "output-available", output })),
    modelText,
  );
}

export function displayAnswer(parts: readonly AnswerPart[], modelText: string): string {
  const outputs = parts
    .filter((part) => part.type.startsWith("tool-") && part.state === "output-available")
    .map((part) => part.output)
    .filter((output): output is Record<string, unknown> => typeof output === "object" && output !== null);
  if (outputs.some((output) => output.reason === "unavailable")) return UNREAD;
  if (outputs.length > 0 && outputs.every((output) => output.found === false)) return SILENCE;
  return modelText.trim();
}
