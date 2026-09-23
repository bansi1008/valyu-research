import OpenAI from "openai";
import { withRetry, withTimeout } from "../../utils/concurrency.js";
import { calculateTTSCost } from "../../utils/cost.js";
import type { DialogueTurn } from "./generatePodcastScript.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 300_000,
  maxRetries: 0,
});

const SPEAKER_CONFIG = {
  Host1: {
    voice: "alloy" as const,
    instructions: `British male science podcast host.
Warm, intelligent, analytical and conversational.
Speak naturally with varied pacing and emphasis.
Sound genuinely interested rather than like a newsreader.`,
  },
  Host2: {
    voice: "nova" as const,
    instructions: `Curious and engaging science podcast co-host.
Warm, enthusiastic, expressive and conversational.
Use natural emotional reactions and relatable pacing.`,
  },
};

export interface SynthesizeDialogueResult {
  buffer: Buffer;
  durationSeconds: number;
  cost: number;
}

export async function synthesizeDialogueAudio(
  turns: DialogueTurn[],
): Promise<SynthesizeDialogueResult> {
  const audioChunks: Buffer[] = [];
  let totalWordCount = 0;
  let totalCharacters = 0;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    const config = SPEAKER_CONFIG[turn.speaker] || SPEAKER_CONFIG.Host1;
    totalWordCount += turn.text.trim().split(/\s+/).length;
    totalCharacters += turn.text.length;

    const response = await withRetry(() =>
      withTimeout(
        client.audio.speech.create({
          model: "gpt-4o-mini-tts",
          voice: config.voice,
          input: turn.text,
          instructions: config.instructions,
          response_format: "mp3",
        }),
        60_000,
        `Dialogue turn ${i + 1} (${turn.speaker}) audio synthesis`,
      ),
    );

    const arrayBuffer = await response.arrayBuffer();
    audioChunks.push(Buffer.from(arrayBuffer));
  }

  const mergedBuffer = Buffer.concat(audioChunks);
  const durationSeconds = Math.max(10, Math.round(totalWordCount / 2.6));
  const cost = calculateTTSCost(totalCharacters);

  return {
    buffer: mergedBuffer,
    durationSeconds,
    cost,
  };
}
