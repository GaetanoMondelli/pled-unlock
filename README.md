### Core Architecture

https://account-d.docusign.com/me/appconsent

1. **Framework & Technologies**:
- Built using NextJS for the frontend
- Uses Hardhat for Ethereum development
- Implements RainbowKit, Wagmi, and Viem for Web3 interactions
- TypeScript for type safety
- Utilizes shadcn/ui components for the UI

2. **Main Components**:

#### Contract Debugging System

```12:67:packages/nextjs/app/debug/_components/DebugContracts.tsx
export function DebugContracts() {
  const contractsData = useAllContracts();
  const contractNames = useMemo(() => Object.keys(contractsData) as ContractName[], [contractsData]);

  const [selectedContract, setSelectedContract] = useSessionStorage<ContractName>(
    selectedContractStorageKey,
    contractNames[0],
    { initializeWithValue: false },
  );

  useEffect(() => {
    if (!contractNames.includes(selectedContract)) {
      setSelectedContract(contractNames[0]);
    }
  }, [contractNames, selectedContract, setSelectedContract]);

  return (
    <div className="flex flex-col gap-y-6 lg:gap-y-8 py-8 lg:py-12 justify-center items-center">
      {contractNames.length === 0 ? (
        <p className="text-3xl mt-14">No contracts found!</p>
      ) : (
        <>
          {contractNames.length > 1 && (
            <div className="flex flex-row gap-2 w-full max-w-7xl pb-1 px-6 lg:px-10 flex-wrap">
              {contractNames.map(contractName => (
                <button
                  className={`btn btn-secondary btn-sm font-light hover:border-transparent ${
                    contractName === selectedContract
                      ? "bg-base-300 hover:bg-base-300 no-animation"
                      : "bg-base-100 hover:bg-secondary"
                  }`}
                  key={contractName}
                  onClick={() => setSelectedContract(contractName)}
                >
                  {contractName}
                  {(contractsData[contractName] as GenericContract)?.external && (
                    <span className="tooltip tooltip-top tooltip-accent" data-tip="External contract">
                      <BarsArrowUpIcon className="h-4 w-4 cursor-pointer" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {contractNames.map(contractName => (
            <ContractUI
              key={contractName}
              contractName={contractName}
              className={contractName === selectedContract ? "" : "hidden"}
            />
          ))}
        </>
      )}
    </div>
  );
}
```

- Provides a UI for interacting with deployed smart contracts
- Allows reading and writing to contracts
- Shows contract variables and state

#### Block Explorer

```11:81:packages/nextjs/app/blockexplorer/page.tsx
const BlockExplorer: NextPage = () => {
  const { blocks, transactionReceipts, currentPage, totalBlocks, setCurrentPage, error } = useFetchBlocks();
  const { targetNetwork } = useTargetNetwork();
  const [isLocalNetwork, setIsLocalNetwork] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (targetNetwork.id !== hardhat.id) {
      setIsLocalNetwork(false);
    }
  }, [targetNetwork.id]);

  useEffect(() => {
    if (targetNetwork.id === hardhat.id && error) {
      setHasError(true);
    }
  }, [targetNetwork.id, error]);

  useEffect(() => {
    if (!isLocalNetwork) {
      notification.error(
        <>
          <p className="font-bold mt-0 mb-1">
            <code className="italic bg-base-300 text-base font-bold"> targetNetwork </code> is not localhost
          </p>
          <p className="m-0">
            - You are on <code className="italic bg-base-300 text-base font-bold">{targetNetwork.name}</code> .This
            block explorer is only for <code className="italic bg-base-300 text-base font-bold">localhost</code>.
          </p>
          <p className="mt-1 break-normal">
            - You can use{" "}
            <a className="text-accent" href={targetNetwork.blockExplorers?.default.url}>
              {targetNetwork.blockExplorers?.default.name}
            </a>{" "}
            instead
          </p>
        </>,
      );
    }
  }, [
    isLocalNetwork,
    targetNetwork.blockExplorers?.default.name,
    targetNetwork.blockExplorers?.default.url,
    targetNetwork.name,
  ]);
  useEffect(() => {
    if (hasError) {
      notification.error(
        <>
          <p className="font-bold mt-0 mb-1">Cannot connect to local provider</p>
          <p className="m-0">
            - Did you forget to run <code className="italic bg-base-300 text-base font-bold">yarn chain</code> ?
          </p>
          <p className="mt-1 break-normal">
            - Or you can change <code className="italic bg-base-300 text-base font-bold">targetNetwork</code> in{" "}
            <code className="italic bg-base-300 text-base font-bold">scaffold.config.ts</code>
          </p>
        </>,
      );
    }
  }, [hasError]);

  return (
    <div className="container mx-auto my-10">
      <SearchBar />
      <TransactionsTable blocks={blocks} transactionReceipts={transactionReceipts} />
      <PaginationButton currentPage={currentPage} totalItems={Number(totalBlocks)} setCurrentPage={setCurrentPage} />
    </div>
  );
};
```

- Custom block explorer for local development
- Shows transactions, blocks, and contract interactions
- Includes search functionality and pagination

#### Document Management System

```183:358:packages/nextjs/components/ui/playground-view.tsx
export const PlaygroundView = () => {
  const [config, setConfig] = useState<DocuSignConfig>({
    integrationKey: "",
    accountId: "",
    userId: "",
    privateKey: "",
    oAuthServer: ""
  });
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKeyContent, setPrivateKeyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const [authenticated, setAuthenticated] = useState(false);
  const [envelopeId, setEnvelopeId] = useState<string>("");
  const [auth, setAuth] = useState<{ accessToken: string; accountId: string } | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [showSigningDialog, setShowSigningDialog] = useState(false);
  const [tabPositions, setTabPositions] = useState<TabPosition[]>([]);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch initial configuration
    fetch('/api/docusign/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        // Store the actual private key content
        setPrivateKeyContent(data.privateKey || '');
      })
      .catch(error => {
        console.error('Error loading config:', error);
        setStatus(`Error: ${error.message}`);
      });
  }, []);
  const toggleEdit = () => {
    if (isEditing) {
      // Fetch config again to reset
      fetch('/api/docusign/config')
        .then(res => res.json())
        .then(data => {
          setConfig(data);
        })
        .catch(error => {
          console.error('Error resetting config:', error);
        });
    }
    setIsEditing(!isEditing);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleConfigChange = (key: keyof DocuSignConfig) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setConfig(prev => ({ ...prev, [key]: e.target.value }));
  };

  // DocuSign API operations
  const operations = {
    authenticate: async () => {
      try {
        setStatus(
          "🔄 Authenticating...\n" +
          "Connecting to DocuSign and requesting JWT token..."
        );
        const response = await fetch('/api/docusign/authenticate', {
          method: 'POST'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Authentication failed');
        }

        const authData = await response.json();
        setAuth(authData);
        setAuthenticated(true);
        setStatus(
          "✅ Authentication Successful!\n\n" +
          "Connected to DocuSign with:\n" +
          `Account ID: ${authData.accountId}\n` +
          "Access Token: [Secured]\n\n" +
          "You can now create and send envelopes."
        );
      } catch (error: any) {
        setStatus(
          "❌ Authentication Failed\n\n" +
          `Error: ${error.message}\n\n` +
          "Please check your configuration and try again."
        );
      }
    },

    createEnvelope: async () => {
      if (!auth || !authenticated) {
        setStatus(
          "❌ Not Authenticated\n\n" +
          "Please authenticate with DocuSign first before creating an envelope."
        );
        return;
      }
      if (!selectedFile) {
        setStatus(
          "❌ No File Selected\n\n" +
          "Please select a document to create an envelope."
        );
        return;
      }
      
      try {
        setStatus(
          "🔄 Creating Envelope...\n\n" +
          "1. Uploading document\n" +
          "2. Setting up recipients\n" +
          "3. Configuring signature fields"
        );
        const formData = new FormData();
        formData.append('signerEmail', recipients.split('\n')[0].trim());
        formData.append('signerName', 'Test Signer');
        formData.append('document', selectedFile);

        // Add tab positions
        const tabs = {
          signHereTabs: tabPositions.map(pos => ({
            ...pos,
            documentId: '1',
            recipientId: '1'
          }))
        };
        formData.append('tabs', JSON.stringify(tabs));

        // Add template variables
        formData.append('templateData', JSON.stringify(templateVariables));

        const response = await fetch('/api/docusign/envelope', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Account-Id': auth.accountId
          },
          body: formData
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create envelope');
        }

        const result = await response.json();
        setEnvelopeId(result.envelopeId);
        setStatus(
          "✅ Envelope Created Successfully!\n\n" +
          `Envelope ID: ${result.envelopeId}\n` +
          "Status: Draft\n\n" +
          "You can now:\n" +
          "• Send the envelope to recipients\n" +
          "• Add more signature positions\n" +
          "• Check envelope status"
        );
      } catch (error: any) {
        setStatus(
          "❌ Envelope Creation Failed\n\n" +
          `Error: ${error.message}\n\n` +
          "Please check your document and try again."
        );
      }
    },
```

- Integration with DocuSign for document signing
- Handles envelope creation and management
- Supports multiple document statuses and workflows

### Key Features

1. **Smart Contract Integration**:
- Contract hot reload capability
- Custom hooks for Web3 interactions
- Debug interface for contract testing

2. **State Machine Implementation**:

```10:59:packages/nextjs/app/home/page.tsx
export default function ContractStateMachine() {
  const [stateDefinition, setStateDefinition] = useState(`
    import { createMachine } from 'xstate';

    const contractMachine = createMachine({
      id: 'contract',
      initial: 'draft',
      states: {
        draft: {
          on: { SUBMIT: 'review' }
        },
        review: {
          on: { 
            APPROVE: 'approved',
            REJECT: 'draft'
          }
        },
        approved: {
          type: 'final'
        }
      }
    });
  `)

  // const pdfUrl = "https://quantmondelli.vercel.app/firstpatent.pdf"

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Contract State Machine</h1>
      <Tabs defaultValue="pdf" className="w-full">
        <TabsList>
          <TabsTrigger value="pdf">PDF Template</TabsTrigger>
          <TabsTrigger value="state-machine">State Machine</TabsTrigger>
        </TabsList>
        {/* <TabsContent value="pdf">
          <PDFViewer pdfUrl={pdfUrl} />
        </TabsContent> */}
        <TabsContent value="state-machine">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StateMachineEditor 
              stateDefinition={stateDefinition} 
              setStateDefinition={setStateDefinition} 
            />
            <StateMachineDiagram stateDefinition={stateDefinition} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- Implements a state machine for contract workflows
- Visual diagram representation
- State transition management

3. **Template System**:

```321:378:packages/nextjs/components/templates/CreateTemplateModal.tsx
const ANALYSIS_MODES = {
  "gpt-4-turbo-preview": "GPT-4 Turbo (Fastest)",
  "gpt-4": "GPT-4 (Most Reliable)",
  "gpt-3.5-turbo": "GPT-3.5 (Basic)",
  "expert": "Expert System Mode"
} as const;

const StateActionView
```

- Template creation and management
- Multiple analysis modes including GPT integration
- Visual graph representation of workflows

4. **Security Features**:

```8:47:packages/hardhat/scripts/listAccount.ts
async function main() {
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;

  if (!encryptedKey) {
    console.log("🚫️ You don't have a deployer account. Run `yarn generate` or `yarn account:import` first");
    return;
  }

  const pass = await password({ message: "Enter your password to decrypt the private key:" });
  let wallet: Wallet;
  try {
    wallet = (await Wallet.fromEncryptedJson(encryptedKey, pass)) as Wallet;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    console.log("❌ Failed to decrypt private key. Wrong password?");
    return;
  }

  const address = wallet.address;
  console.log(await QRCode.toString(address, { type: "terminal", small: true }));
  console.log("Public address:", address, "\n");

  // Balance on each network
  const availableNetworks = config.networks;
  for (const networkName in availableNetworks) {
    try {
      const network = availableNetworks[networkName];
      if (!("url" in network)) continue;
      const provider = new ethers.JsonRpcProvider(network.url);
      await provider._detectNetwork();
      const balance = await provider.getBalance(address);
      console.log("--", networkName, "-- 📡");
      console.log("   balance:", +ethers.formatEther(balance));
      console.log("   nonce:", +(await provider.getTransactionCount(address)));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log("Can't connect to network", networkName);
    }
  }
}
```

- Encrypted private key management
- Network-specific configurations
- Balance and nonce tracking

### Development Tools

1. **API Utilities**:

```1:41:packages/nextjs/utils/api.ts
export async function fetchFromDb() {
  const response = await fetch('/api/db');
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  return response.json();
}

export async function updateDb(data: any) {
  const response = await fetch('/api/db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'update',
      data: data
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to update data');
  }
  return response.json();
}

// Helper function to get procedure data from the main DB
export async function getProcedureData(id: string) {
  const data = await fetchFromDb();
  
  const instance = data.procedureInstances?.find((p: any) => p.instanceId === id);
  if (!instance) {
    throw new Error('Instance not found');
  }

  const template = data.procedureTemplates?.find((t: any) => t.templateId === instance.templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  return { instance, template };
}
```

- Database interaction helpers
- Procedure and template management
- Error handling utilities

2. **UI Components**:
- Modular card components
- Custom hooks for state management
- Responsive design implementation

### Project Structure
- `/packages/nextjs`: Frontend application
- `/packages/hardhat`: Smart contract development
- `/components`: Reusable UI components
- `/utils`: Helper functions and utilities
- `/hooks`: Custom React hooks

The codebase represents a comprehensive dApp development framework with additional features for document management, workflow automation, and smart contract interaction. It's designed to be modular and extensible, with strong typing and separation of concerns.
