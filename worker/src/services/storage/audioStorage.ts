import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: "valyu-509317",
});

const BUCKET_NAME = process.env.AUDIO_BUCKET_NAME || "valyu-audio";

export interface UploadPodcastAudioResult {
  audioPath: string;
  audioUrl: string;
}

export async function uploadPodcastAudio(
  taskId: string,
  buffer: Buffer,
): Promise<UploadPodcastAudioResult> {
  const audioPath = `podcasts/${taskId}.mp3`;
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(audioPath);

  await file.save(buffer, {
    contentType: "audio/mpeg",
    resumable: false,
    metadata: {
      contentType: "audio/mpeg",
      cacheControl: "public, max-age=31536000",
    },
  });

  const audioUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${audioPath}`;

  return {
    audioPath,
    audioUrl,
  };
}
