import { chatCompletion, type ChatCompletionOptions } from "./client.js";
import {
  type PersonaAPromptOptions,
  systemPromptMentorSentinel,
  systemPromptPersonaA,
  userPromptForTranscript,
  userPromptMentor,
} from "./prompts.js";
import type { RandomSessionPayload, TranscriptLine } from "./types.js";

export async function runPersonaAReply(params: {
  session: RandomSessionPayload;
  transcript: TranscriptLine[];
  personaAOptions?: PersonaAPromptOptions;
  options?: ChatCompletionOptions;
}): Promise<string> {
  const messages = [
    {
      role: "system" as const,
      content: systemPromptPersonaA(params.session, params.personaAOptions),
    },
    {
      role: "user" as const,
      content: userPromptForTranscript(params.transcript),
    },
  ];

  const { content } = await chatCompletion(messages, {
    temperature: 0.65,
    max_tokens: 512,
    signal: params.options?.signal,
  });
  return content.trim();
}

export async function runMentorSentinel(params: {
  session: RandomSessionPayload;
  transcript: TranscriptLine[];
  kind: "stuck" | "nuclear";
  options?: ChatCompletionOptions;
}): Promise<string> {
  const messages = [
    {
      role: "system" as const,
      content: systemPromptMentorSentinel(params.session, params.kind),
    },
    { role: "user" as const, content: userPromptMentor(params.transcript) },
  ];

  const { content } = await chatCompletion(messages, {
    temperature: 0.35,
    max_tokens: null,
    signal: params.options?.signal,
  });
  return content.trim();
}
