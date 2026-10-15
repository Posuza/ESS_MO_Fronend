const SDK_URL = "https://ess-faceregister.esscentor.com/sdk/v1/index.js";
export type EssAuthClient = {
  employeeId: string | null;
  error: Error | null;
  login(): void;
  logout(): Promise<void>;
};

let authPromise: Promise<EssAuthClient> | undefined;

export function getEssAuth(): Promise<EssAuthClient> {
  authPromise ??= import(/* @vite-ignore */ SDK_URL).then(
    ({ default: EssAuth }) =>
      EssAuth.init({
        publicKey: import.meta.env.VITE_ESS_PUBLIC_KEY,
      }),
  );

  return authPromise;
}

export async function loginWithEss(): Promise<void> {
  (await getEssAuth()).login();
}

export async function logoutFromEss(): Promise<void> {
  await (await getEssAuth()).logout();
}
