# LineageTable Component Test Suite

This directory contains comprehensive tests for the LineageTable component, covering functionality, performance, accessibility, and integration scenarios.

## Test Files Overview

### 1. `LineageTable.basic.test.ts` ✅ (Working)

- **Purpose**: Tests core data processing logic without React dependencies
- **Coverage**: Search, sorting, grouping, formatting functions
- **Environment**: Node.js (Vitest)
- **Status**: Fully functional with current setup

### 2. `LineageTable.unit.test.tsx` ⚠️ (Requires Dependencies)

- **Purpose**: Unit tests for React component behavior
- **Coverage**: Component rendering, user interactions, state management
- **Dependencies**: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- **Environment**: jsdom

### 3. `LineageTable.integration.test.tsx` ⚠️ (Requires Dependencies)

- **Purpose**: Integration tests for complex user workflows
- **Coverage**: Multi-step interactions, state consistency, data updates
- **Dependencies**: Same as unit tests
- **Environment**: jsdom

### 4. `LineageTable.performance.test.tsx` ⚠️ (Requires Dependencies)

- **Purpose**: Performance testing with large datasets
- **Coverage**: Rendering speed, memory usage, responsiveness
- **Dependencies**: Same as unit tests
- **Environment**: jsdom

### 5. `LineageTable.accessibility.test.tsx` ⚠️ (Requires Dependencies)

- **Purpose**: Accessibility compliance testing
- **Coverage**: ARIA attributes, keyboard navigation, screen reader support
- **Dependencies**: `jest-axe`, testing libraries
- **Environment**: jsdom

### 6. `testUtils.ts`

- **Purpose**: Utility functions for creating test data and helpers
- **Coverage**: Mock data generators, test helpers
- **Status**: Ready to use

## Test Coverage Areas

### Core Functionality

- ✅ Search and filtering across all token properties
- ✅ Multi-column sorting (generation, timestamp, value, operation)
- ✅ Grouping by generation, operation, and source node
- ✅ Data formatting (timestamps, values, metadata)
- ✅ Edge case handling (empty data, malformed data)

### User Interface (Requires React Testing Setup)

- 🔄 Component rendering and display
- 🔄 Interactive controls (buttons, dropdowns, inputs)
- 🔄 Expandable rows with detailed information
- 🔄 Column visibility toggles
- 🔄 Row selection and callbacks

### User Experience (Requires React Testing Setup)

- 🔄 Complete user workflows
- 🔄 State consistency across operations
- 🔄 Dynamic data updates
- 🔄 Error handling and recovery

### Performance (Requires React Testing Setup)

- 🔄 Large dataset handling (1000+ nodes)
- 🔄 Rendering performance
- 🔄 Memory usage optimization
- 🔄 Rapid state changes

### Accessibility (Requires React Testing Setup)

- 🔄 WCAG compliance
- 🔄 Keyboard navigation
- 🔄 Screen reader compatibility
- 🔄 Focus management

## Running Tests

### Current Working Tests

```bash
# Run basic logic tests (works with current setup)
npm run test:run -- components/lineage/__tests__/LineageTable.basic.test.ts
```

### Full Test Suite (Requires Setup)

To run the complete test suite, you'll need to install testing dependencies:

```bash
# Install required testing dependencies
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom jest-axe

# Update vitest config for React testing
# Add to vitest.config.ts:
# environment: 'jsdom'
# setupFiles: ['./test-setup.ts']

# Run all tests
npm run test:run -- components/lineage/__tests__/
```

## Test Data

### Mock Lineage Structure

The tests use a comprehensive mock lineage with:

- **Generation 0**: Root mint token (TOKEN-001)
- **Generation 1**: Two split tokens (TOKEN-002, TOKEN-003)
- **Generation 2**: Transfer, burn, and remaining tokens
- **Generation 3**: Merged token combining previous tokens
- **Generation 4**: Staked token for yield generation

### Test Scenarios

- **Simple lineage**: 4-8 nodes for basic functionality
- **Complex lineage**: Multi-generational with various operations
- **Large lineage**: 1000+ nodes for performance testing
- **Edge cases**: Empty data, malformed data, missing properties

## Test Utilities

### Data Generators

- `createMockNode()`: Creates individual token nodes
- `createMockLineage()`: Creates complete lineage structures
- `createComplexLineage()`: Multi-generational test data
- `createLargeLineage()`: Performance testing data
- `createEdgeCaseLineage()`: Edge case scenarios

### Helper Functions

- `getDataRows()`: Extracts data rows from rendered table
- `getGroupRows()`: Extracts group header rows
- `simulateUserInteraction`: User interaction helpers
- `waitForAsync()`: Async operation helpers

## Testing Strategy

### 1. Unit Testing

- Test individual functions and component methods
- Mock external dependencies
- Focus on single responsibility

### 2. Integration Testing

- Test component interactions
- Test complete user workflows
- Verify state management

### 3. Performance Testing

- Measure rendering times
- Test with large datasets
- Monitor memory usage

### 4. Accessibility Testing

- Automated accessibility checks
- Keyboard navigation testing
- Screen reader compatibility

## Known Issues and Limitations

### Current Setup Limitations

1. **Missing React Testing Dependencies**: The full test suite requires additional packages
2. **Environment Configuration**: Vitest needs jsdom environment for React tests
3. **Setup Files**: Need test setup file for jest-dom matchers

### Workarounds

1. **Basic Logic Tests**: Core functionality tested without React dependencies
2. **Manual Testing**: UI interactions can be tested manually using the demo component
3. **Type Safety**: TypeScript provides compile-time validation

## Future Improvements

### Test Infrastructure

- [ ] Add React testing dependencies
- [ ] Configure jsdom environment
- [ ] Set up test coverage reporting
- [ ] Add visual regression testing

### Test Coverage

- [ ] Add snapshot testing for component structure
- [ ] Add property-based testing for edge cases
- [ ] Add cross-browser compatibility tests
- [ ] Add mobile responsiveness tests

### Automation

- [ ] Set up CI/CD test pipeline
- [ ] Add pre-commit test hooks
- [ ] Add performance regression detection
- [ ] Add accessibility regression testing

## Contributing

When adding new features to LineageTable:

1. **Add Logic Tests**: Update `LineageTable.basic.test.ts` for new data processing logic
2. **Add Component Tests**: Add React component tests when dependencies are available
3. **Update Test Data**: Extend mock data generators as needed
4. **Document Changes**: Update this README with new test scenarios

## Dependencies Status

### ✅ Available (Current Setup)

- `vitest`: Test runner
- `typescript`: Type checking
- Node.js environment

### ⚠️ Required for Full Testing

- `@testing-library/react`: React component testing
- `@testing-library/user-event`: User interaction simulation
- `@testing-library/jest-dom`: DOM testing matchers
- `jest-axe`: Accessibility testing
- `jsdom`: DOM environment for tests

### 📋 Installation Command

```bash
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom jest-axe
```

Then update `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    environment: "jsdom", // Changed from 'node'
    globals: true,
    setupFiles: ["./test-setup.ts"],
  },
  // ... rest of config
});
```

Create `test-setup.ts`:

```typescript
import "@testing-library/jest-dom";
```
