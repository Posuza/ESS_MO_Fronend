const bucket = Math.floor(Date.now() / 300_000);

const SDK_URL =
  `https://cdn.jsdelivr.net/gh/Posuza/EssAuth@release-v1/cdn/v1/index.js?v=${bucket}`;

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
