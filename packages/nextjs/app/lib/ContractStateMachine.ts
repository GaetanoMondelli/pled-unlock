import { NavigatorResponse } from '../types/navigator';

export enum ContractState {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  COMPLETE = 'COMPLETE'
}

export interface ContractStateContext {
  currentState: ContractState;
  navigatorData?: NavigatorResponse;
  effectiveDate?: Date;
  expirationDate?: Date;
  totalValue?: number;
  parties?: string[];
}

export class ContractStateMachine {
  private context: ContractStateContext;

  constructor(navigatorData?: NavigatorResponse) {
    this.context = {
      currentState: ContractState.DRAFT
    };
    
    if (navigatorData) {
      this.updateFromNavigator(navigatorData);
    }
  }

  private updateFromNavigator(data: NavigatorResponse) {
    const { provisions, parties } = data.rawData;
    
    this.context = {
      ...this.context,
      navigatorData: data,
      effectiveDate: new Date(provisions.effective_date),
      expirationDate: new Date(provisions.expiration_date),
      totalValue: provisions.total_agreement_value,
      parties: parties.map(p => p.name_in_agreement)
    };

    // Update state based on dates and status
    this.determineState();
  }

  private determineState() {
    const now = new Date();
    const { effectiveDate, expirationDate } = this.context;
    const status = this.context.navigatorData?.status;

    if (status === 'COMPLETE') {
      this.context.currentState = ContractState.COMPLETE;
      return;
    }

    if (!effectiveDate || !expirationDate) {
      this.context.currentState = ContractState.DRAFT;
      return;
    }

    if (now < effectiveDate) {
      this.context.currentState = ContractState.PENDING_SIGNATURE;
    } else if (now >= effectiveDate && now <= expirationDate) {
      this.context.currentState = ContractState.ACTIVE;
    } else if (now > expirationDate) {
      this.context.currentState = ContractState.EXPIRED;
    }
  }

  // Add methods for state transitions
  public canTransitionTo(newState: ContractState): boolean {
    // Implement transition rules
    const { currentState } = this.context;
    
    // Example rules:
    switch (currentState) {
      case ContractState.DRAFT:
        return newState === ContractState.PENDING_SIGNATURE;
      case ContractState.PENDING_SIGNATURE:
        return newState === ContractState.ACTIVE;
      case ContractState.ACTIVE:
        return [ContractState.COMPLETE, ContractState.TERMINATED].includes(newState);
      default:
        return false;
    }
  }

  public getContext(): ContractStateContext {
    return { ...this.context };
  }
} 