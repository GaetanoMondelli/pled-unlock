import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"

const allowedUsernamesPasswordsArray: readonly [string, string][] = [
    ["mark", "0xwiggin"],
    ["gmondelli", "0xwiggins"],
    ["paola", "cmscms2024"],
    ["andrea", "cmscms2024"],
    ["steve", "fti2024"],
    ["susana", "fti2024"],
    ["emma", "fti2024"],
    ["jeremy", "fti2024"],
    ["gaetano", "Sannicandro2024!"],

];
const allowedUsernamesPasswords = new Map<string, string>(
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