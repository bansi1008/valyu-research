import { db } from "../../../dbconfig/db.js";

export async function createTask(question: string, searchType: string = "all") {
  const taskRef = db.collection("tasks").doc();

  await taskRef.set({
    question,
    searchType,
    status: "queued",
    progress: 0,
    currentStage: "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return taskRef.id;
}
