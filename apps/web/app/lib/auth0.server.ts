import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const domain = process.env.AUTH0_DOMAIN!;
const clientId = process.env.AUTH0_CLIENT_ID!;
const clientSecret = process.env.AUTH0_CLIENT_SECRET!;
const callbackUrl = process.env.AUTH0_CALLBACK_URL!;
const audience = process.env.AUTH0_AUDIENCE!;

const client = jwksClient({
  jwksUri: `https://${domain}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
}

export function getAuthorizationUrl(request: Request): string {
  const origin = new URL(request.url).origin;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${origin}/auth/callback`,
    audience: audience,
    scope: "openid profile email",
    state: crypto.randomUUID(),
  });
  return `https://${domain}/authorize?${params}`;
}

export async function exchangeCodeForTokens(request: Request, code: string) {
  const origin = new URL(request.url).origin;
  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${origin}/auth/callback`,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    access_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
  }>;
}

export async function verifyAccessToken(token: string) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header.kid) {
    throw new Error("Invalid token");
  }

  const signingKey = await getSigningKey(decoded.header.kid);

  return jwt.verify(token, signingKey, {
    algorithms: ["RS256"],
    audience: audience,
    issuer: `https://${domain}/`,
  }) as {
    sub: string;
    permissions?: string[];
    email?: string;
    name?: string;
    [key: string]: unknown;
  };
}

export function getLogoutUrl(request: Request): string {
  const origin = new URL(request.url).origin;
  const params = new URLSearchParams({
    client_id: clientId,
    returnTo: origin,
  });
  return `https://${domain}/v2/logout?${params}`;
}
