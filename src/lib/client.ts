// src/lib/client.ts
import { createThirdwebClient } from "thirdweb";

// A .env.local-ban kell lennie: NEXT_PUBLIC_THIRDWEB_CLIENT_ID=...
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!;

export const client = createThirdwebClient({ clientId });
