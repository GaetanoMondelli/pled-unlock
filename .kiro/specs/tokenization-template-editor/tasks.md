# Implementation Plan

## Overview

This implementation plan converts the tokenization template editor design into discrete, manageable coding steps. Each task builds incrementally on previous steps, following test-driven development principles and ensuring no React infinite loops occur.

The plan prioritizes copying the working tokenization_demo components exactly, then adding extensions carefully to avoid the "Maximum update depth exceeded" errors that plagued previous attempts.

## Tasks

- [x] 1. Setup and Dependencies
  - Add ReactFlow dependency to package.json
  - Verify all existing simulation infrastructure is working
  - Copy scenario.json from tokenization_demo to public directory
  - _Requirements: 1.2, 1.5_

- [ ] 2. Copy Working Graph Components
  - [-] 2.1 Copy GraphVisualization component from tokenization_demo
    - Copy tokenization_demo/components/graph/GraphVisualization.tsx to packages/nextjs/components/graph/
    - Update import paths to match main project structure
    - Verify component renders without errors
    - _Requirements: 1.1, 1.5, 13.1_

  - [ ] 2.2 Copy node display components from tokenization_demo
    - Copy all files from tokenization_demo/components/graph/nodes/ to packages/nextjs/components/graph/nodes/
    - Update import paths in node components
    - Verify all node types render correctly
    - _Requirements: 1.1, 13.1_

- [ ] 3. Copy Working Modal Components
  - [ ] 3.1 Copy NodeInspectorModal from tokenization_demo
    - Copy tokenization_demo/components/modals/NodeInspectorModal.tsx to packages/nextjs/components/modals/
    - Update import paths and verify modal opens/closes correctly
    - Test component configuration editing functionality
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1_

  - [ ] 3.2 Copy TokenInspectorModal from tokenization_demo
    - Copy tokenization_demo/components/modals/TokenInspectorModal.tsx to packages/nextjs/components/modals/
    - Update import paths and verify token history display works
    - Test token tracking and provenance features
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 3.3 Copy GlobalLedgerModal from tokenization_demo
    - Copy tokenization_demo/components/modals/GlobalLedgerModal.tsx to packages/nextjs/components/modals/
    - Update import paths and verify global activity log displays
    - Test filtering and search functionality
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 4. Update Template Editor Page
  - [ ] 4.1 Replace template editor page with working simulation interface
    - Update packages/nextjs/app/template-editor/page.tsx to use copied components
    - Import GraphVisualization, NodeInspectorModal, TokenInspectorModal, GlobalLedgerModal
    - Replicate exact UI structure from tokenization_demo/app/page.tsx
    - _Requirements: 13.1, 13.4, 13.5_

  - [ ] 4.2 Verify simulation functionality works exactly like tokenization_demo
    - Test play/pause/step controls work without errors
    - Verify token generation and flow animation
    - Test component state monitoring and activity logs
    - Ensure no React infinite loop errors occur
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.2, 6.3, 6.4, 13.6_

- [ ] 5. Add Component Palette for Editing
  - [ ] 5.1 Create component palette UI
    - Create ComponentPalette component with drag-and-drop support
    - Implement component type buttons (DataSource, Queue, ProcessNode, Sink)
    - Add drag handlers that set dataTransfer with component type
    - Style palette to match existing UI design
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

  - [ ] 5.2 Implement node creation with proper ID generation
    - Create createDefaultNode helper function using nanoid for unique IDs
    - Implement default configurations for each component type
    - Add position parameter for drag-and-drop placement
    - Test node creation generates valid scenario updates
    - _Requirements: 1.3, 2.1, 2.6_

- [ ] 6. Add Drag-and-Drop Editing
  - [ ] 6.1 Extend GraphVisualization with drop handling
    - Add onDrop, onDragOver handlers to ReactFlow component
    - Implement screenToFlowPosition for accurate drop positioning
    - Update scenario state through existing loadScenario method
    - Test drag-and-drop creates nodes at correct positions
    - _Requirements: 2.1, 2.6_

  - [ ] 6.2 Implement connection editing
    - Add onConnect handler to ReactFlow for creating connections
    - Update scenario nodes to reflect new connections (destinationNodeId, inputNodeIds)
    - Validate connections using existing validation logic
    - Test connection creation updates both visual and scenario state
    - _Requirements: 2.3, 2.4, 2.6, 2.7_

- [ ] 7. Add Component Configuration Editing
  - [ ] 7.1 Enable editing mode when simulation is paused
    - Add editing mode state to control when components can be edited
    - Show/hide connection handles based on editing mode
    - Display configuration panel when components are selected in edit mode
    - _Requirements: 2.2, 2.5_

  - [ ] 7.2 Implement live configuration updates
    - Extend NodeInspectorModal to allow property editing
    - Update scenario state when configuration changes
    - Validate configuration changes using existing schemas
    - Test configuration updates reflect in both UI and simulation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 2.6_

- [ ] 8. Add JSON Editor Synchronization
  - [ ] 8.1 Add scenario JSON editor dialog
    - Create ScenarioEditorModal with JSON textarea
    - Load current scenario into editor when opened
    - Add validation and error display for invalid JSON
    - _Requirements: 8.5, 2.7_

  - [ ] 8.2 Implement bidirectional synchronization
    - Update JSON editor when visual changes are made
    - Update visual diagram when JSON is edited and applied
    - Maintain cursor position and formatting in JSON editor
    - Test both directions of synchronization work correctly
    - _Requirements: 2.6, 2.7, 8.5_

- [ ] 9. Add Message Interface System
  - [ ] 9.1 Extend component schemas with message interface support
    - Add optional messageInterfaces array to scenario schema
    - Define MessageInterface type with field definitions
    - Extend component types with inputMessageTypes and outputMessageTypes
    - Maintain backward compatibility with existing scenarios
    - _Requirements: 12.1, 12.2_

  - [ ] 9.2 Implement message interface editor
    - Create MessageInterfaceEditor component for defining message types
    - Add interface selection to component configuration
    - Validate message compatibility when connecting components
    - _Requirements: 12.1, 12.3, 12.4, 12.6_

  - [ ] 9.3 Enhance formula editor with message field support
    - Extend formula validation to include available message fields
    - Add autocomplete for message fields in ProcessNode formulas
    - Display available fields in configuration UI
    - Test formula validation with message interfaces
    - _Requirements: 9.1, 9.2, 9.3, 12.3, 12.5_

- [ ] 10. Add Template Management
  - [ ] 10.1 Implement template save functionality
    - Add save template dialog with metadata fields (name, description, author)
    - Integrate with existing PLED template storage system
    - Save complete scenario with message interfaces and metadata
    - _Requirements: 8.1, 8.2_

  - [ ] 10.2 Implement template load functionality
    - Add template browser/selector interface
    - Load templates and restore complete diagram state
    - Handle version compatibility and migration if needed
    - _Requirements: 8.3_

  - [ ] 10.3 Add template export/import
    - Implement JSON export with proper formatting
    - Add import functionality with validation
    - Support sharing templates between users
    - _Requirements: 8.4_

- [ ] 11. Performance Optimization and Error Prevention
  - [ ] 11.1 Implement performance monitoring
    - Add React DevTools Profiler integration for detecting update loops
    - Implement circular buffer limits for activity logs
    - Add throttling for real-time UI updates
    - _Requirements: 10.1, 10.2, 10.4_

  - [ ] 11.2 Add comprehensive error handling
    - Implement circuit breaker for infinite loop prevention
    - Add error boundaries around critical components
    - Provide graceful degradation when errors occur
    - _Requirements: 10.5, 13.6_

- [ ] 12. Testing and Validation
  - [ ] 12.1 Create comprehensive test suite
    - Write unit tests for all new utility functions
    - Add integration tests for component interactions
    - Test error scenarios and edge cases
    - _Requirements: All requirements_

  - [ ] 12.2 Perform compatibility testing
    - Verify existing PLED functionality remains unaffected
    - Test with various scenario configurations
    - Validate performance with complex diagrams
    - _Requirements: 10.1, 11.3, 11.4_

## Implementation Notes

### Critical Success Factors

1. **Start with Working Code**: Always begin with the exact working components from tokenization_demo
2. **Incremental Changes**: Add one feature at a time and test thoroughly
3. **Immediate Rollback**: If React errors occur, immediately revert to last working state
4. **Pattern Adherence**: Follow only the patterns proven to work in the existing simulation

### Error Prevention Strategies

1. **State Management**: Use only the proven Zustand patterns from simulationStore.ts
2. **Component Updates**: Follow the exact useEffect patterns from working components
3. **Dependency Arrays**: Use only stable dependencies, avoid computed values
4. **Event Handlers**: Use useCallback with stable dependencies only

### Testing Approach

1. **Copy Verification**: Ensure copied components work identically to originals
2. **Feature Addition**: Test each new feature in isolation
3. **Integration Testing**: Verify new features don't break existing functionality
4. **Performance Testing**: Monitor for memory leaks and update loops

### Rollback Plan

If any task introduces React errors:
1. Immediately revert all changes from that task
2. Analyze the error and identify the problematic pattern
3. Research alternative approaches that follow working patterns
4. Re-implement using proven patterns only