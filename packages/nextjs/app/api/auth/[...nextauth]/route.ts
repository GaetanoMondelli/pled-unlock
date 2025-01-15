import NextAuth, {NextAuthOptions} from "next-auth"
import {options, allowedUsernamesPasswords} from "@/app/api/configAuth";

const authhandler = NextAuth(options);

export {authhandler as GET, authhandler as POST};