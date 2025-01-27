### Core Architecture

https://account-d.docusign.com/me/appconsent




### Instructions

Please find the instruction in the repository. This is a next js app so woudl be required to run it with:
- yarn install
- yarn start

Make sure to add these enviroment variables in the .env file 
NEXT_PUBLIC_ALCHEMY_API_KEY=
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
NEXTAUTH_SECRET='RANDMON_STRING_SECRET'
NEXTAUTH_URL=
FIREBASE_SERVICE_ACCOUNT=
FIREBASE_STORAGE_BUCKET=
DOCUSIGN_ACCOUNT_ID=
OPENAI_API_KEY=
NEXT_PUBLIC_LAZY_RULE_MATCHING
NEXT_PUBLIC_ENABLE_LLM_RULES=

*FIREBASE_STORAGE_BUCKET=Name of the Firebase bucket that will contain the pled.json (our full demo database)
*NEXT_PUBLIC_LAZY_RULE_MATCHING If enabled, the system will stop evaluating rules as soon as the first match is found. Rules are prioritized based on their assigned priority value, with a maximum of 100 indicating the lowest priority. In the CreateEventModal debug tool, only the first matched rule will be displayed.
*NEXT_PUBLIC_ENABLE_LLM_RULES This runs AI prompts for rule checking. Prompt caching is not yet implemented, so during the demo, an API call to OpenAI will be triggered each time an event fails to match a priority 1 rule.

We also need the correct values extracted from the QuickStart app for the specific integration key being used. These values ensure accurate setup and seamless operation for the integration.

app/api/config/jwtConfig.json

{
  "dsJWTClientId": "",
  "impersonatedUserGuid": "",
  "privateKeyLocation": "./private.key",
  "dsOauthServer": ",
  "secret": ""
}
Make sure the private key is in the same position as indicated in the jwtConfig.json

Once added the FIREBASE_SERVICE_ACCOUNT= we can use the
`yarn pled:upload` to upload `packages/nextjs/public/pled.json`
 into the right  storage bucket and make it availble

### Provide any libraries or APIs you used

Docusign:
- JWT authentication (with relevant scopes)
- Envelope API (Sign)
- Navigator API 
- ClickWrap API

OpenAI (sdk)  (models: GPT-4 Turbo, GPT-4, GPT-3.5 Turbo)
- Completion API

Firebase API(sdk) @/app/lib/firebase"  
- Firestore API for strorage
An example of the strcuture of the entire DB model is in a dump of the storage file (pled.json)