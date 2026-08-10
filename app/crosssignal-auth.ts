import {
  getChatGPTUser,
  requireChatGPTUser,
  type ChatGPTUser,
} from "./chatgpt-auth";

const DEVELOPMENT_OWNER: ChatGPTUser = {
  userId: "local-development-owner",
  displayName: "Local owner",
  email: "owner@crosssignal.local",
  fullName: "Local owner",
};

export async function getCrossSignalUser(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  if (user) return user;

  return process.env.NODE_ENV === "development" ? DEVELOPMENT_OWNER : null;
}

export async function requireCrossSignalUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getCrossSignalUser();
  if (user) return user;

  return requireChatGPTUser(returnTo);
}
