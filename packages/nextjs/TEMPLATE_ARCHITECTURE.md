# Template Architecture & Component System

## Overview

This system provides a composable state machine architecture for building workflow templates. The architecture separates concerns into three main areas:

## 🏗️ Architecture Components

### 1. **Component Lab** (`/components-lab`)

- **Purpose**: Library of individual reusable state machine components
- **Focus**: Single-purpose components that can be composed into larger workflows
- **Examples**: IoT Validator, Data Queue, Token Creator, Quality Splitter
- **Use Case**: Developers browse and understand individual building blocks

### 2. **Template Editor** (`/template-editor`)

- **Purpose**: Visual workflow builder for creating new templates
- **Focus**: Drag-and-drop interface for connecting components into complete workflows
- **Features**:
  - Component palette with 6 state machine types
  - Visual canvas for component placement
  - Properties panel for configuration
  - FSL (Finite State Language) generation
  - Template save to Firestore
- **Use Case**: Business users create new workflow templates without coding

### 3. **Templates Browse** (`/templates`)

- **Purpose**: Marketplace and management of complete workflow templates
- **Focus**: Complete end-to-end workflow templates ready for deployment
- **Features**:
  - Marketplace tab for discovering templates
  - Manage tab for editing/deleting owned templates
  - Template inspection showing component boundaries
- **Use Case**: Users find, deploy, and manage complete workflow solutions

## 🔧 State Machine Component Types

The system includes 6 composable component types:

| Component                 | Purpose                                           | Example Use                                    |
| ------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| **IoT Validator**         | Validates IoT measurements with crypto signatures | Verify renewable energy meter data             |
| **Data Queue**            | Accumulates and batches data for processing       | Collect hourly measurements into daily batches |
| **Data Processor**        | Processes and transforms data                     | Convert kWh readings to carbon tokens          |
| **Quality Splitter**      | Routes data based on quality/conditions           | Separate high-quality from low-quality tokens  |
| **Token Accumulator**     | Accumulates tokens until threshold                | Pool tokens until certificate minimum reached  |
| **Certificate Generator** | Generates certificates/documents                  | Create compliance certificates                 |

## 📋 Template Examples

### Carbon Credit Templates (Now Available)

- **Hydro Power**: VCS standard, daily aggregation, 1000 kWh/token
- **Solar Power**: Gold Standard, weather compensation, irradiance validation
- **Wind Power**: CDM standard, turbine efficiency checks, hourly processing

Each template demonstrates:

- Component boundaries via FSL comments
- Industry standard compliance
- Complete workflow from IoT → Certificate

## 🔄 Workflow Design Process

1. **Design** in Template Editor:

   - Drag components to canvas
   - Configure component properties
   - Connect components via state transitions
   - Preview generated FSL

2. **Save** template to Firestore with:

   - Metadata (name, description, category)
   - Component definitions and boundaries
   - Generated FSL state machine
   - Configuration parameters

3. **Deploy** from Templates page:
   - Browse marketplace for templates
   - Inspect component boundaries
   - Create procedure instances
   - Monitor workflow execution

## 🌟 Key Innovations

- **Composable Architecture**: Small components combine into complex workflows
- **Visual Design**: No-code template creation through drag-and-drop
- **FSL Generation**: Automatic code generation from visual design
- **Component Boundaries**: Clear separation shown in FSL comments
- **Industry Standards**: Built-in compliance for carbon credits (VCS, GS, CDM)
- **Firestore Integration**: Cloud storage and real-time collaboration

## 🎯 User Personas

- **Developers**: Use Component Lab to understand and create individual components
- **Business Analysts**: Use Template Editor to design complete workflows visually
- **End Users**: Use Templates Browse to deploy and manage workflow instances
- **Compliance Officers**: Inspect templates to verify component boundaries and standards compliance
