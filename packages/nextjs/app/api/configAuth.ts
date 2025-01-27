import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"

const allowedUsernamesPasswordsArray: readonly [string, string | undefined][] = [
    ["devpost", process.env.AUTH_DEVPOST_PASSWORD],
    ["docusign", process.env.AUTH_DOCUSIGN_PASSWORD],
    ["gmondelli", process.env.AUTH_GMONDELLI_PASSWORD],
];
const allowedUsernamesPasswords = new Map<string, any>(
    allowedUsernamesPasswordsArray
);
const options : NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60,
    },
    
    providers: [
        CredentialsProvider({
            type: "credentials",
            async authorize(credentials, req) {
                if (!credentials?.password || !credentials?.username) {
                    return null;
                }
                const password = allowedUsernamesPasswords.get(credentials.username);
                if (!password || password !== credentials.password) {
                    return null;
                }

                const user = {
                    id: allowedUsernamesPasswordsArray.findIndex(([username, _]) => username === credentials.username),
                    name: credentials.username,
                    email: "",
                    image: "",
                }
    
                return user as any;
            },
            credentials: {
                username: { label: "Username", type: "text", placeholder: "Username" },
                password: { label: "Password", type: "password" },
            },
        }),
    ]
}

export {options, allowedUsernamesPasswords};