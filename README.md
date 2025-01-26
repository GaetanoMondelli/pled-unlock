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
FIREBASE_SERVICE_ACCOUNT='
DOCUSIGN_ACCOUNT_ID=
OPENAI_API_KEY=

and the the proper values from the following (extracted from the QuickStart-app for a particular integration key)

app/api/config/jwtConfig.json

{
  "dsJWTClientId": "",
  "impersonatedUserGuid": "",
  "privateKeyLocation": "./private.key",
  "dsOauthServer": ",
  "secret": ""
}
make sure the private key is in the same position as indicated in the jwtConfig.json 

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