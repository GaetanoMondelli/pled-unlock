## Inspiration

> “A set of promises, specified in digital form, including protocols within which the parties perform on these promises." Nick Szabo’s 1997 vision of smart contracts

I've always been intrigued by how smart contracts and legal contracts, while operating in different trust settings, share the same goal of enabling coordination and collaboration.
Smart contracts are precise and automated, perfect for enforcing clear rules, but they lack the flexibility to handle complex real-world situations. Legal contracts are flexible and adaptable but rely on interpretation, which can make them less predictable.
Nick Szabo's first ideas on smart contracts and Ricardian contracts led me to explore how agreements could become more efficient by balancing automation with flexibility. I came to see that while contracts enable collaboration, they can’t fully manage or automate every scenario on their own.
I designed an architecture to bridge this gap. Rather than replacing legal contracts, it tracks, organizes, and supports decisions within contracts and collaborative processes. 

This architecture uses events stored on DLTs, much like evidence in a trial. Interpreting these events rebuilds the state of the collaboration, and adding new evidence or reinterpreting with different rules can alter the predicted state. 

The name PLED (Practical Ledgers) originates from a [Gartner's 2020 Top 10 Strategic Technology Trends](https://www.gartner.com/smarterwithgartner/gartner-top-10-strategic-technology-trends-for-2020) article, which highlighted *Practical blockchain's* potential for practical applications due to its transparency, integrity, and non-repudiability properties.


## What It Does

This solution is designed to help track and manage procedures that are often the foundation of collaboration, as defined in contracts, policies, and other documents. The goal is to provide a flexible and useful way to understand the current state of a process and support better decision-making.

[Live demo](https://pled-six.vercel.app/)

### Architecture

![architecture](https://github.com/GaetanoMondelli/docusign-unlocked/blob/main/packages/nextjs/public/architecture.png?raw=true)

A PLED instance architecture includes **variables**, **events**, **messages**, a **state machine**, and **actions**. Here's how it works:

- **Events**: Data in any format (e.g., emails, documents, photos, signed data).  
  - Processed into **messages** using rules.  
  - Rules can be deterministic (e.g., field values) or depend on external inputs like API calls or LLM prompts.
- **Messages**: Meaningful outputs from events.  
 - Update the state machine.  
 - Traceable back to their originating events.  
 - Trustworthiness varies (e.g., signed messages are more reliable than API-based messages).
- **State machine**: Models procedures like contracts or policies.  
 - Infers the current state from messages.  
 - Defines actions to execute based on the state.
 - Clear to read, and help ensure safeness and liveness property 
- **Actions**: Executed based on the current state.  
 - Results are stored as new events.  
 - Includes a snapshot of the state, events, and rules for auditability. This ensures full auditability of actions.

### Create reusable procedure template

![wizard](https://github.com/GaetanoMondelli/docusign-unlocked/blob/main/packages/nextjs/public/review-wizard.png?raw=true) 

Users can create templates for similar scenarios and generate instances by providing variables. Templates include event formats, rules to convert events into messages, state machine definitions, and actions to model procedures, which can be complex to set up. 

To simplify the process, Pled lets users generate templates from documents that can then be refined. In the template creation wizard, users can either manually complete the required fields or upload related documents for analysis by AI models. The AI can also integrates insights from the DocuSign Navigator API, helping to model states more effectively and providing warnings about deadlines or critical contract details.

See the differences in the state machine generated from the same agreement without and with the Navigator Insight.
 
![comaprison](https://github.com/GaetanoMondelli/docusign-unlocked/blob/main/packages/nextjs/public/comparison-navigator.png?raw=true)

Messages in this architecture represent meaningful interactions, such as updating a rent agreement from "Active" to "Notice Given." To remain flexible, the system avoids relying on rigid rules or exact wording. Instead, it uses AI to interpret the intent behind actions, ensuring it feels natural for users who may not follow strict digital formats. 

The system is designed to operate with minimal third-party synchronization and integrations. Events such as emails, API responses, or signed documents are passively collected and grouped into messages. These messages represent meaningful interactions, like updating a rent agreement from "Active" to "Notice Given." To stay flexible, the system avoids relying solely on rigid rules. Instead, it uses AI to interpret the intent behind actions.

For instance, in our demo, we created a rule to check if a candidate had requested an interview. If they did, the system generated a message to update the state machine, ensuring the workflow evolved naturally

![llm-rule](https://github.com/GaetanoMondelli/docusign-unlocked/blob/main/packages/nextjs/public/llm-rule.png?raw=true)


Messages are generated from one or more events but often have different dates. The event date reflects when the data was received, while the message date usually represents when the interaction occurred. 
As messages are processed, the system determines the most likely current state of the workflow and takes appropriate actions. These actions might include notifying relevant parties, triggering automated processes like sending reminders, or generating updates. Additionally, certain states can prompt specific actions, ensuring workflows remain dynamic and responsive.

![llm-rule](https://github.com/GaetanoMondelli/docusign-unlocked/blob/main/packages/nextjs/public/msg.png?raw=true)


Imagine a user uploading a rent agreement. The AI creates a template that outlines the typical lifecycle of a rent agreement. The admin can then customize it with specific rules and events. Each agreement becomes its own instance, tracking progress individually. For example, if a tenant sends an email saying, "I want to terminate the agreement," the system recognizes this intent, updates the state to "Notice Given," notifies everyone involved, and triggers the next steps automatically. In case of a dispute, the system can share all the evidence and events that led to its determination of the current state, making it easier to reconcile differences among parties.

## How we built it

The project was built using **Next.js** for server-side rendering and quick project setup, combined with **React** to handle the dynamic and interactive user interface. To keep the design consistent, we used **shadcn** for the styling framework.

Initially, the plan was to render state machines using [xstate](https://xstate.js.org/)  and [state-viz](https://github.com/statelyai/xstate-viz) , but since some of these tools  have been archived or close-sourced, we had to pivot. Instead, we used [FSL](https://stonecypher.github.io/fsl/draft%20tutorial.html) to model the state machines, [jssm](https://stonecypher.github.io/jssm/docs/) to evaluate their logic, and [D3.js](https://d3js.org/) to create custom visualizations of the state transitions. 
State machine and visualization tools help users design and understand workflows. However, managing larger, more complex workflows manually can be overwhelming.
AI enhances this process by analyzing contracts, policies, and workflows to predict rules, suggest actions, and identify triggers, making complex workflows easier to define, visualize, and manage.

In this demo, we use AI models tailored to different needs. Users can choose GPT-3 for quick processing, GPT-4 for reliable analysis, or GPT-4o for high accuracy in handling complex workflows.


The project uses DocuSign APIs, to manage agreements and capture consent for terms and conditions. These APIs act as both event triggers and tools for state machine transitions. For example, when a signed employment contract is received via the eSignature API, the system can automatically notarize it and move to the onboarding phase. Similarly, if a user accepts terms and conditions through the Click API, the system grants them app access.
In addition to triggering events, DocuSign APIs support PLED actions. For instance, during negotiations, if terms align with a policy, the system can automatically sign and notarize the contract once all conditions are met. 
This process is further enhanced by the Navigator API by finding key contract details and sending timely actions or notifications to avoid missing important deadlines, keeping everything on track.



## Challenges 

- On a more technical note, create a proper diagram to handle state machine was not the easiest thing. While AI generation tools like Claude Sonet or Copilot are very useful with fast prototyping, they were not very helpful when designing a graph diagram component. To be fair was not even easier describe the problem, sometimes it just did not look right. Diagram were shown with an algorithm that was optisiming their space density allowing to have a compact view however reducing the readability in State machine that are usually shown top to down or left to right. The key insight was recognizing that state machines are structurally similar to Directed Acyclic Graphs (DAGs), except that state machines can have cycles. Despite this difference, representation methods for DAGs proved very effective. I used [Dagre.js](https://github.com/dagrejs/dagre) to achieve a more readable visualization.

- When we started using AI to encode procedures into a state-machine architecture, we also ran into some big challenges. At first, we tried using a single prompt to generate templates directly from the document. Even though we clearly provided logical constraints; like ensuring each state transition had at least one rule—these weren’t always satisfied. The state machine often missed contract states, and rules to convert events (like emails) into messages for the state machine were frequently skipped.
To fix this, we switched to a technique called chain prompting (expert system). Instead of relying on one big prompt, we broke the process into steps. First, we used a stronger model to deduce the main structure and logic of the state machine from the document. Then, we programmatically extracted transitions to ensure no steps were overlooked. Finally, we ran a simpler, faster model to generate at least one rule for each transition. This approach made the process more reliable and cost-effective while keeping things manageable.
- [Single prompt](https://github.com/GaetanoMondelli/docusign-unlocked/blob/8fbe7de95c2aea3a7ed3628ace88b367456d96a3/packages/nextjs/app/api/analyze-document/route.ts#L36)
- [Expert System with separate helper prompt functions ](https://github.com/GaetanoMondelli/docusign-unlocked/blob/8fbe7de95c2aea3a7ed3628ace88b367456d96a3/packages/nextjs/app/api/analyze-document/route.ts#L107) 

---

> “There are 2 hard problems in computer science: cache invalidation, naming things, and off-by-1 errors" Martin Fowler

In this prototype, we store all events and templates in a Firebase Firestore JSON file. For each procedure, we load these events, apply rules, and convert them into messages, which we then feed into a state machine. This approach works well for the scale of our demo, but scaling will require caching messages and intermediate machine states.
A key challenge is providing users with flexibility. Users may need to modify anything from the set of events to the rules or the state machine definition itself. This flexibility is expected in legal contexts, where a state or situation is considered valid until further evidence is provided. If users have new evidence or better ways to interpret it, they must be able to present and apply them.
Any such change would require re-triggering the entire state computation. However, depending on the ordering of events and rules, it’s possible that only a subset of the computation needs to be redone. This is where [snapshotting](https://www.kurrent.io/blog/snapshots-in-event-sourcing) becomes relevant. While snapshotting is traditionally applied to streams where the event sequence is immutable, here we must handle dynamic changes. This requires maintaining multiple snapshots and determining the most recent valid one when a change occurs. From there, we can replay only the necessary parts of the process. 

Another engineering challenge involves managing actions. In workflows or DAGs, we can enumerate all possible paths between states, allowing us to easily flag executed actions for any given state. In state machines, this becomes more complex, especially with features like self-loops. Managing the history of paths can lead to unbounded growth. During event replay, we must identify actions that have not yet been executed.
To address this, we maintain two lists: executedActions (in green in the demo) and toBeExecutedActions (in orange in the demo). If the state machine definition and underlying events remain unchanged, and events have only been appended, the first items in toBeExecutedActions should match executedActions. The remaining items, or pendingActions, are the new actions to be executed. However, if the state machine definition, rules, or underlying events have changed, the process becomes more complex. Pending actions must be reevaluated, and in our prototype, we handle this by replaying all actions.

This complexity is even bigger when actions generate new events, potentially creating feedback loops. Such mechanisms require careful consideration to avoid runaway cycles while ensuring correctness and liveness in event processing

## What's next for Pled

This architecture could be a foundation for vetted AI agents, ensuring they act within boundaries and avoid unsafe states. With full traceability of events, rules, and actions, it offers transparency and auditability. It could also enhance DAOs by automating processes while being more flexible than traditional smart contracts, allowing organizations to evolve naturally and integrate better with external systems.


Unfortunately, not everything could be covered in the video due to time constraints. However, you can explore further by creating a new template instance, populating it with events using other PLED integrations, experimenting with rules, and even enabling instances to interact with one another [here](pled-six.vercel.app)


*Note:* In future demo iterations, agents could continuously listen for status updates to ensure agreements and clickwraps reach "status:completed" and "hasAgreed:true" states, respectively, allowing automatic state machine progression. For this demo, events are manually fetched after signatures or consents are completed.

##  How This Differs from Zapier, Make.com DocuSign Maestro or Salesforce Workflow

Pled is more than just an automation or low-code tool; it’s a protocol designed to track and manage the state of procedures autonomously. Unlike tools like DocuSign Maestro or Salesforce Workflow, which rely on predefined workflows, Pled takes a unique approach. It interprets raw events and transforms them into meaningful messages that drive state changes within interoperable state machines.

What makes Pled unique is its adaptability and focus on transparency. Its architecture supports changes to evidence, rules, or state machine definitions without disrupting the process.  This design ensures transparency by keeping a complete history of all changes. This can be a great fit for regulated AI Agents. For example, each automated action in Pled includes a snapshot of the machine definition, events, and message rules at the time of execution; every decision can be fully tracked and audited, meeting the high standards required for transparency and accountability in regulated environments, e.g. [EU AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai). At the same time, Pled’s architecture allows processes to adapt over time while retaining a clear record of its evolution.

This is not about automating tasks; it is about enabling meaningful and transparent collaboration that can be shared with the right level of context, visibility, and control. Insights and workflows often reside in unstructured documents. The ability to standardize and digitize documents flexibly while making information actionable is highly valuable (see last week [raise from Instabase](https://techcrunch.com/2025/01/17/instabase-raises-100m-to-help-companies-process-unstructured-document-data/) )
Coordination doesn’t always start with signed contracts, whether under Common or Civil Law. It begins with intent, communication, and shared understanding. Pled reflects this reality by enabling processes to progress naturally while staying flexible and transparent as they evolve.











## Documentation and Roadmap

New architecture and product docs (API + backend + SDK + blockchain roadmap):

- docs/PRODUCT_VISION.md — Product vision for PLED as FSM + tokenization protocol
- docs/PRD_TEMPLATE_EDITOR_BACKEND.md — PRD for backend/API powering the template editor and executions
- docs/API_ARCHITECTURE.md — Service design, data model, and endpoints (MVP → future)
- docs/SDK_DESIGN.md — TypeScript SDK surface and developer experience
- docs/BLOCKCHAIN_ROADMAP.md — Commitments, tokenization, and ZK path
- docs/OPEN_QUESTIONS.md — Open decisions and alignment checklist

These complement the existing Next.js simulation and will guide the transition to a full multi-tenant service.


## Adapter-based storage/auth abstraction (template-editor wired)

We introduced a provider-agnostic platform layer to decouple product code from specific storage/auth backends. This makes it easy to swap Firebase, Postgres, or other providers by implementing small adapters ("drivers") while keeping the rest of the app unchanged.

- Contracts (ports): `packages/nextjs/lib/platform/ports.ts` define `AuthProvider`, `DocumentStore`, and `BlobStore` interfaces.
- Current adapters: Firestore-backed `DocumentStore` and NextAuth-backed `AuthProvider`.
- Repositories: `TemplatesRepository` and `ExecutionsRepository` encapsulate collection paths and timestamp policies.
- Facade: `dataService` exposes CRUD for templates and executions.

Template-editor API routes now use the new `dataService`:

- `GET/POST /api/admin/templates` → `packages/nextjs/app/api/admin/templates/route.ts`
- `GET/PUT/DELETE /api/admin/templates/[templateId]` → `packages/nextjs/app/api/admin/templates/[templateId]/route.ts`

This means storage can be swapped by changing only the platform adapter wiring in:

- `packages/nextjs/lib/platform/index.ts` (factory that composes adapters)
- `packages/nextjs/lib/platform/adapters/**/*` (implementations)

Next steps we plan:

- Migrate remaining routes/endpoints to use `dataService` (executions list/save/update).
- Add env-based switching (e.g., `DATA_BACKEND=postgres`) and a `BlobStore` adapter for binary assets.
- Gradually remove direct references to Firebase files after migration is complete.












