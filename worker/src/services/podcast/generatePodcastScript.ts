import OpenAI from "openai";
import { z } from "zod";
import { withRetry, withTimeout } from "../../utils/concurrency.js";
import { calculateOpenAICost } from "../../utils/cost.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60_000,
  maxRetries: 0,
});

export const DialogueTurnSchema = z.object({
  speaker: z.enum(["Host1", "Host2"]),
  text: z.string(),
});

export const PodcastScriptSchema = z.object({
  turns: z.array(DialogueTurnSchema).min(4).max(16),
});

export type DialogueTurn = z.infer<typeof DialogueTurnSchema>;
export type PodcastScript = z.infer<typeof PodcastScriptSchema>;

export interface GeneratePodcastScriptResult {
  script: PodcastScript;
  cost: number;
}

export async function generatePodcastScript(
  question: string,
  report: string,
): Promise<GeneratePodcastScriptResult> {
  const response = await withRetry(() =>
    withTimeout(
      client.responses.parse({
        model: "gpt-5.6-luna",
        input: [
          {
            role: "system",
            content: `You are an elite science podcast producer directing a conversation between two podcasters.

The Podcasters:
- Host 1 (Lead Analyst): Analytical, structured, warm, and explains core findings and mechanisms.
- Host 2 (Inquisitive Co-host): Curious, asks sharp clarifying questions, offers intuitive analogies, and reacts with authentic human emotions.

Rules:
-start with a brief and like welcome everybody to this podcast today we will explore..., engaging introduction to the research topic and question.
- Create a lively, realistic, back-and-forth dialogue (6 to 12 turns total).
Use natural performance markers such as:
(laughs)
(chuckles)
(thoughtfully)
(surprised)
(pause)
(softly)

These markers are intended for the downstream TTS model.
Do not overuse them. Do not explain them.
- Focus on answering the research question comprehensively based strictly on the provided evidence.
- Do not read citations, section headings, or markdown bullet points aloud. Write spoken conversational dialogue only.
- The conversation must conclude with a proper wrap-up and sign-off outro. Summarize the main takeaway and have both hosts warmly sign off (e.g., "Thanks for tuning in, see you next time!") so it never ends abruptly.`,
          },
          {
            role: "user",
            content: `Research Question:
${question}

Research Report & Evidence:
${report}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "podcast_dialogue",
            strict: true,
            schema: z.toJSONSchema(PodcastScriptSchema),
          },
        },
      }),
      60_000,
      "Podcast dialogue script generation",
    ),
  );

  if (!response.output_parsed) {
    throw new Error("Failed to parse structured podcast dialogue script");
  }

  const cost = calculateOpenAICost(response.usage);

  return {
    script: PodcastScriptSchema.parse(response.output_parsed),
    cost,
  };
}
