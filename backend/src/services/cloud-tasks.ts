import { CloudTasksClient } from "@google-cloud/tasks";

const client = new CloudTasksClient();

const projectId = "valyu-509317";
const location = "europe-west1";
const queue = "research-tasks";

export type TaskQueuePayload =
  | { type: "research"; taskId: string }
  | { type: "podcast"; taskId: string };

export async function enqueueTask(payload: TaskQueuePayload) {
  const parent = client.queuePath(projectId, location, queue);

  const task = {
    httpRequest: {
      httpMethod: "POST" as const,
      url: process.env.WORKER_URL!,
      headers: {
        "Content-Type": "application/json",
      },
      oidcToken: {
        serviceAccountEmail:
          "valyu-worker@valyu-509317.iam.gserviceaccount.com",
      },
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
    },
  };

  const [response] = await client.createTask({
    parent,
    task,
  });

  console.log(`Enqueued ${payload.type} task ${payload.taskId} with name: ${response.name}`);
  return response.name;
}

export async function enqueueResearchTask(taskId: string) {
  return enqueueTask({ type: "research", taskId });
}

export async function enqueuePodcastTask(taskId: string) {
  return enqueueTask({ type: "podcast", taskId });
}
