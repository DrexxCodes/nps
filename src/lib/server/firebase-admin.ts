import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env";

function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const e = env();
  return initializeApp({
    credential: cert({ projectId: e.FIREBASE_PROJECT_ID, clientEmail: e.FIREBASE_CLIENT_EMAIL, privateKey: e.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }),
  });
}

export const adminAuth = () => getAuth(app());
export const db = () => getFirestore(app());
