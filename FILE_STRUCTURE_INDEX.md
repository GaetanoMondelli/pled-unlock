# PLED File Structure Index

## Root Directory

```
docusign-unlocked/
├── .github/                    # GitHub configuration and workflows
├── .husky/                     # Git hooks configuration  
├── .vscode/                    # VS Code workspace settings
├── .yarn/                      # Yarn package manager files
├── packages/                   # Monorepo packages
├── PROJECT_OVERVIEW.md         # High-level project description
├── TECHNICAL_ARCHITECTURE.md   # Technical implementation details
├── FILE_STRUCTURE_INDEX.md     # This file - navigation guide
├── README.md                   # Main project documentation
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENCE                     # Project license
├── package.json                # Root package configuration
├── yarn.lock                   # Dependency lock file
└── navigator_postman.json      # DocuSign Navigator API collection
```

## Packages Structure

### packages/nextjs/ - Frontend Application

#### Core Application
```
packages/nextjs/
├── app/                        # Next.js 13+ App Router
│   ├── api/                   # API routes
│   ├── lib/                   # Utilities and configurations
│   ├── types/                 # TypeScript type definitions
│   ├── procedures/            # Procedure management pages
│   ├── templates/             # Template management pages
│   ├── auth/                  # Authentication pages
│   ├── layout.tsx             # Root layout component
│   └── page.tsx              # Home page
├── components/                # React components
├── hooks/                     # Custom React hooks
├── public/                    # Static assets
├── scripts/                   # Build and utility scripts
├── styles/                    # CSS and styling files
└── package.json              # Package dependencies
```

#### API Routes (`app/api/`)
```
api/
├── auth/
│   └── [...nextauth]/route.ts         # NextAuth.js configuration
├── docusign/
│   ├── authenticate/route.ts          # DocuSign OAuth flow
│   ├── config/route.ts               # DocuSign configuration
│   ├── envelopes/
│   │   ├── [id]/
│   │   │   ├── route.ts             # Envelope details
│   │   │   └── view/route.ts        # Envelope viewing
│   │   └── route.ts                 # Envelope operations
│   ├── click/
│   │   ├── authenticate/route.ts     # Click API auth
│   │   ├── clickwraps/
│   │   │   ├── [clickwrapId]/
│   │   │   │   ├── route.ts         # Clickwrap management
│   │   │   │   └── agreements/route.ts # Agreement tracking
│   │   │   └── route.ts             # Clickwrap listing
│   │   ├── create/route.ts          # Create clickwrap
│   │   ├── status/route.ts          # Status checking
│   │   └── users/route.ts           # User management
│   ├── navigator/
│   │   ├── authenticate/route.ts     # Navigator API auth
│   │   ├── proxy/route.ts           # API proxy
│   │   ├── callback/route.ts        # OAuth callback
│   │   ├── route.ts                 # Navigator operations
│   │   └── agreements/route.ts      # Agreement analysis
│   ├── esign/
│   │   └── authenticate/route.ts     # eSignature API auth
│   └── oauth/
│       └── callback/route.ts        # OAuth callback handler
├── procedures/
│   ├── [id]/route.ts                 # Individual procedure operations
│   └── events/route.ts               # Event management
├── events/route.ts                   # Global event operations
├── actions/route.ts                  # Action execution
├── analyze-document/route.ts         # AI document analysis
├── check-question/route.ts           # AI question validation
├── contact/route.ts                  # Contact form
├── login/route.ts                    # User login
└── db/route.ts                       # Database operations
```

#### Components (`components/`)
```
components/
├── scaffold-eth/                     # Ethereum-related components
│   ├── Address/                     # Address display components
│   ├── Input/                       # Form input components
│   ├── RainbowKitCustomConnectButton/ # Wallet connection
│   ├── Balance.tsx                  # ETH balance display
│   ├── BlockieAvatar.tsx            # Avatar component
│   ├── Faucet.tsx                   # Test network faucet
│   └── index.tsx                    # Component exports
├── ui/                              # UI components
│   ├── action-execution-list.tsx    # Action tracking
│   ├── action-list.tsx              # Action management
│   ├── alert.tsx                    # Alert component
│   ├── badge.tsx                    # Badge component
│   ├── button.tsx                   # Button component
│   ├── card.tsx                     # Card component
│   ├── checkbox.tsx                 # Checkbox component
│   ├── collapsible.tsx              # Collapsible content
│   ├── d3-graph.tsx                 # D3.js graph visualization
│   ├── dialog.tsx                   # Modal dialog
│   ├── dropdown-menu.tsx            # Dropdown menu
│   ├── envelope-documents.tsx       # Document display
│   ├── envelope-view.tsx            # Envelope visualization
│   ├── event-list.tsx               # Event listing
│   ├── fsm-definition-modal.tsx     # State machine editor
│   ├── input.tsx                    # Text input
│   ├── label.tsx                    # Form label
│   ├── message-rules.tsx            # Rule management
│   ├── node-details-dialog.tsx      # Graph node details
│   ├── playground-view.tsx          # Testing interface
│   ├── procedure-content.tsx        # Procedure display
│   ├── procedure-state.tsx          # State visualization
│   ├── scroll-area.tsx              # Scrollable area
│   ├── select.tsx                   # Select dropdown
│   ├── separator.tsx                # Visual separator
│   ├── sheet.tsx                    # Side panel
│   ├── sidebar.tsx                  # Navigation sidebar
│   ├── skeleton.tsx                 # Loading placeholder
│   ├── state-graph.tsx              # State machine graph
│   ├── state-history.tsx            # State transition history
│   ├── switch.tsx                   # Toggle switch
│   ├── table.tsx                    # Data table
│   ├── tabs.tsx                     # Tab navigation
│   ├── template-content.tsx         # Template display
│   ├── template-variable.tsx        # Variable editor
│   ├── textarea.tsx                 # Multi-line input
│   ├── tooltip.tsx                  # Tooltip component
│   ├── utils.ts                     # UI utilities
│   └── variables-view.tsx           # Variable management
├── layout/                          # Layout components
│   ├── Navbar.tsx                   # Navigation bar
│   └── SettingsMenu.tsx             # Settings dropdown
├── procedures/                      # Procedure-specific components
│   └── CreateProcedureModal.tsx     # Procedure creation
├── templates/                       # Template-specific components
│   └── CreateTemplateModal.tsx      # Template creation
├── events/                          # Event-specific components
│   └── CreateEventModal.tsx         # Event creation
├── variables/                       # Variable management
│   └── VariablesSection.tsx         # Variable section
├── marketing/                       # Marketing components
│   └── RequestDemoDialog.tsx        # Demo request form
├── animated-logo.tsx                # Animated logo
├── BottomLedger.tsx                 # Footer ledger display
├── CustomEthProvider.tsx            # Ethereum provider
├── Footer.tsx                       # Page footer
├── Header.tsx                       # Page header
├── HeroFsmAnimation.tsx             # Hero section animation
├── HowItWorksFlow.tsx               # Feature explanation
├── navbar.tsx                       # Main navigation
├── pdf-viewer.tsx                   # PDF document viewer
├── PhotoStillLife.tsx               # Photo display component
├── procedure-card.tsx               # Procedure card display
├── procedure-list.tsx               # Procedure listing
├── ScaffoldEthAppWithProviders.tsx  # App providers
├── sidebar.tsx                      # Main sidebar
├── state-machine-diagram.tsx        # State machine visualization
├── state-machine-editor.tsx         # State machine editor
├── SwitchTheme.tsx                  # Theme toggle
├── ThemeProvider.tsx                # Theme context
└── TurbineStateMachineScene.tsx     # 3D state machine scene
```

#### Core Library Files (`app/lib/`)
```
lib/
├── ContractStateMachine.ts          # Core state machine logic
├── firebase.ts                      # Firebase configuration
└── utils.ts                         # Utility functions
```

### packages/hardhat/ - Smart Contract Development

```
packages/hardhat/
├── contracts/                       # Solidity smart contracts
├── deploy/                         # Deployment scripts
├── scripts/                        # Utility scripts
│   ├── generateAccount.ts          # Account generation
│   ├── importAccount.ts            # Account import
│   ├── listAccount.ts              # Account listing
│   └── runHardhatDeployWithPK.ts   # Deployment with private key
├── test/                           # Contract tests
├── hardhat.config.ts               # Hardhat configuration
├── package.json                    # Package dependencies
└── tsconfig.json                   # TypeScript configuration
```

## Key Configuration Files

### Root Configuration
- **package.json**: Workspace configuration and scripts
- **yarn.lock**: Dependency lock file
- **.gitignore**: Git ignore rules
- **.yarnrc.yml**: Yarn package manager configuration
- **.lintstagedrc.js**: Lint-staged configuration

### Frontend Configuration
- **next.config.js**: Next.js configuration
- **tailwind.config.js**: Tailwind CSS configuration
- **tsconfig.json**: TypeScript configuration
- **.eslintrc.json**: ESLint rules
- **postcss.config.js**: PostCSS configuration

### Smart Contract Configuration
- **hardhat.config.ts**: Hardhat development environment
- **foundry.toml**: Foundry configuration (if used)

## Important Files for Development

### Core Business Logic
- **`app/lib/ContractStateMachine.ts`**: Main state machine implementation
- **`app/api/analyze-document/route.ts`**: AI document analysis
- **`components/ui/state-graph.tsx`**: State machine visualization
- **`components/ui/d3-graph.tsx`**: D3.js graph rendering

### Integration Points
- **`app/api/docusign/`**: All DocuSign API integrations
- **`app/api/auth/[...nextauth]/route.ts`**: Authentication handling
- **`app/lib/firebase.ts`**: Database configuration

### UI Components
- **`components/ui/`**: Reusable UI components
- **`components/layout/`**: Layout and navigation
- **`app/layout.tsx`**: Root application layout

## Development Workflow Files

### Scripts
- **`scripts/pled-sync.ts`**: Data synchronization
- **Package scripts**: Defined in `package.json` files
- **Deploy scripts**: In `packages/hardhat/deploy/`

### Testing
- **`packages/hardhat/test/`**: Smart contract tests
- **Component tests**: Co-located with components
- **E2E tests**: (to be added in future)

## Documentation Files

- **`README.md`**: Main project documentation
- **`PROJECT_OVERVIEW.md`**: High-level project description
- **`TECHNICAL_ARCHITECTURE.md`**: Technical implementation details
- **`CONTRIBUTING.md`**: Contribution guidelines
- **`FILE_STRUCTURE_INDEX.md`**: This navigation guide

## Asset Files

### Static Assets (`packages/nextjs/public/`)
```
public/
├── images/                         # Image assets
├── icons/                          # Icon files
├── architecture.png                # Architecture diagram
├── comparison-navigator.png        # Feature comparison
├── llm-rule.png                    # AI rule example
├── msg.png                         # Message flow diagram
└── review-wizard.png               # Template wizard screenshot
```

### Styling
- **`packages/nextjs/styles/`**: CSS files
- **Component styles**: Co-located with components
- **Tailwind classes**: Used throughout components

## Navigation Tips

### Finding Components
- **UI Components**: Look in `components/ui/`
- **Page Components**: Check `app/[page]/`
- **Layout Components**: Found in `components/layout/`

### API Endpoints
- **REST APIs**: All in `app/api/`
- **DocuSign Integration**: `app/api/docusign/`
- **Database Operations**: `app/api/db/`

### Configuration
- **Environment Variables**: Set in `.env` files
- **Build Configuration**: `next.config.js`, `hardhat.config.ts`
- **Development Tools**: `.eslintrc.json`, `tsconfig.json`

### Testing
- **Unit Tests**: Co-located with source files
- **Integration Tests**: In respective package test directories
- **Contract Tests**: `packages/hardhat/test/`

This index provides a comprehensive guide to navigating the PLED codebase. Each file and directory serves a specific purpose in the overall architecture, making it easier to locate and understand the different components of the system.