# PLED (Practical Ledgers) - Project Overview

## What is PLED?

PLED is a flexible system designed to track, organize, and support decisions within contracts and collaborative processes. It bridges the gap between rigid smart contracts and flexible legal agreements by providing a transparent, auditable way to manage procedures, workflows, and state transitions.

## Core Concept

PLED uses events stored on distributed ledgers, similar to evidence in a trial. By interpreting these events, the system rebuilds the state of collaboration. New evidence or reinterpretation with different rules can alter the predicted state, making it highly adaptable to real-world scenarios.

## Business Problem Solved

Traditional contract management and workflow systems are either too rigid (smart contracts) or too manual (legal contracts). PLED solves this by:

- **Tracking contract lifecycles** automatically while remaining flexible
- **Converting unstructured communications** (emails, documents, signatures) into structured workflow states
- **Providing transparency and auditability** for all decisions and state changes
- **Enabling AI-assisted interpretation** of intents and actions
- **Supporting dispute resolution** with complete evidence trails

## Key Features

### 1. **Event-Driven Architecture**
- Captures any data format (emails, documents, photos, signed data)
- Processes events into meaningful messages using configurable rules
- Maintains complete audit trail of all interactions

### 2. **State Machine Management**
- Models procedures like contracts, policies, and workflows
- Infers current state from processed messages
- Defines actions to execute based on state transitions
- Ensures safety and liveness properties

### 3. **AI-Powered Intelligence**
- Uses AI to interpret natural language intents
- Generates templates from uploaded documents
- Integrates with DocuSign Navigator API for contract insights
- Supports multiple AI models (GPT-3, GPT-4, GPT-4o) based on accuracy needs

### 4. **Template System**
- Create reusable procedure templates for common scenarios
- Generate instances by providing variables
- Import from documents with AI assistance
- Share templates across organizations

### 5. **Composable State Machine Components**
- Build complex workflows from reusable state machine components
- State-based message emission between components
- Component library with processors, aggregators, validators, and integrators
- Visual workflow builder for connecting components
- Automatic compilation to single optimized state machine

### 6. **DocuSign Integration**
- eSignature API for contract management
- Click API for terms and conditions
- Navigator API for contract analysis and deadline management
- Automatic state transitions based on signature events

## Technical Architecture

### Frontend (Next.js)
- **React-based UI** with shadcn/ui components
- **State machine visualization** using D3.js and Dagre.js
- **Real-time updates** and interactive dashboards
- **Responsive design** for desktop and mobile

### Backend Services
- **Firebase Firestore** for data storage
- **Next.js API routes** for server-side logic
- **OpenAI integration** for AI-powered analysis
- **DocuSign APIs** for document management

### Smart Contract Layer (Hardhat)
- **Ethereum-based** smart contracts for immutable event storage
- **TypeChain** for type-safe contract interactions
- **Comprehensive testing** suite with Chai matchers

## Project Structure

```
docusign-unlocked/
├── packages/
│   ├── nextjs/          # Frontend application
│   │   ├── app/         # Next.js 13+ app directory
│   │   ├── components/  # React components
│   │   ├── lib/         # Utility functions
│   │   └── scripts/     # Build and deployment scripts
│   └── hardhat/         # Smart contract development
│       ├── contracts/   # Solidity contracts
│       ├── deploy/      # Deployment scripts
│       └── test/        # Contract tests
└── docs/                # Documentation (this file)
```

## Use Cases

### 1. **Rental Agreements**
- Track lease lifecycle from "Active" to "Notice Given" to "Terminated"
- Automatically interpret tenant communications about termination
- Generate notifications and trigger next steps

### 2. **Employment Contracts**
- Onboarding process automation
- Policy compliance tracking
- Performance review workflows

### 3. **Service Agreements**
- Project milestone tracking
- Payment schedule management
- Scope change approvals

### 4. **Legal Document Management**
- Contract negotiation workflows
- Signature collection processes
- Compliance deadline tracking

### 5. **Carbon Credit Tokenization**
- IoT measurement validation with cryptographic signatures
- Automated batch processing of renewable energy data
- Token creation with quality scoring and thresholds
- Certificate generation compliant with VCS, Gold Standard, CDM
- End-to-end traceability from device measurements to tradeable certificates

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui, Framer Motion
- **State Management**: Zustand, React Query
- **Visualization**: D3.js, Dagre.js for state machine diagrams
- **Backend**: Node.js, Firebase Admin SDK
- **Database**: Firebase Firestore
- **AI/ML**: OpenAI GPT models
- **Blockchain**: Ethereum, Hardhat, ethers.js
- **Authentication**: NextAuth.js, DocuSign OAuth
- **External APIs**: DocuSign eSignature, Click, Navigator APIs

## Development Status

The project is actively developed and includes:
- ✅ Core PLED architecture implementation
- ✅ DocuSign API integrations
- ✅ AI-powered template generation
- ✅ State machine visualization
- ✅ Event processing pipeline
- ✅ Template and procedure management
- ✅ Composable state machine components
- ✅ Carbon credit tokenization workflow
- ✅ Template marketplace with search and filtering
- ✅ Component compilation to single state machine
- 🔄 Visual component workflow builder
- 🔄 Enhanced scalability features
- 🔄 Advanced AI model integrations
- 🔄 Mobile app development

## Getting Started

See the main [README.md](./README.md) for detailed setup instructions and deployment guides.

## Live Demo

Explore the live demo at: [pled-six.vercel.app](https://pled-six.vercel.app/)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to the project.