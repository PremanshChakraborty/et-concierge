/**
 * lib/auth.ts — AWS Amplify Auth wrappers.
 * Call Amplify.configure() once in main.tsx before any of these run.
 */

import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
  signOut as amplifySignOut,
  fetchAuthSession,
  getCurrentUser,
  type SignInOutput,
  type SignUpOutput,
} from "aws-amplify/auth";

export async function signIn(email: string, password: string): Promise<SignInOutput> {
  return amplifySignIn({ username: email, password });
}

export async function signUp(email: string, password: string): Promise<SignUpOutput> {
  return amplifySignUp({
    username: email,
    password,
    options: { userAttributes: { email } },
  });
}

export async function confirmSignUp(email: string, code: string) {
  return amplifyConfirmSignUp({ username: email, confirmationCode: code });
}

export async function signOut() {
  return amplifySignOut();
}

/** Returns the raw Cognito access token string. Throws if not signed in. */
export async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  if (!token) throw new Error("No access token — user is not signed in.");
  return token;
}

/** Returns the Cognito user's email. */
export async function getCurrentUserEmail(): Promise<string> {
  const user = await getCurrentUser();
  return user.signInDetails?.loginId ?? user.username;
}
