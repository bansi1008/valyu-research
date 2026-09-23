import { db } from "../../../dbconfig/db.js";

export async function getTask(taskId: string) {
  const taskRef = db.collection("tasks").doc(taskId);
  const taskDoc = await taskRef.get();
  return taskDoc.exists ? { id: taskDoc.id, ...taskDoc.data() } : null;
}
