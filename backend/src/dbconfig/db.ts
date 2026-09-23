import { Firestore } from "@google-cloud/firestore";

export const db = new Firestore({
  projectId: "valyu-509317",
  databaseId: "valyu",
});
