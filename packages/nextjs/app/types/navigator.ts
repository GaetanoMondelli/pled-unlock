export interface NavigatorParty {
  id: string;
  name_in_agreement: string;
}

export interface NavigatorProvisions {
  effective_date: string;
  expiration_date: string;
  total_agreement_value: number;
  total_agreement_value_currency_code: string;
  payment_terms_due_date: string;
  can_charge_late_payment_fees: boolean;
  late_payment_fee_percent: number;
  termination_period_for_convenience: string;
}

export interface NavigatorResponse {
  id: string;
  fileName: string;
  type: string;
  category: string;
  status: string;
  created: string;
  modified: string;
  rawData: {
    parties: NavigatorParty[];
    provisions: NavigatorProvisions;
    languages: string[];
    metadata: {
      created_at: string;
      modified_at: string;
    };
  };
}

export interface NavigatorInsight {
  id: string;
  fileName: string;
  type: string;
  category: string;
  status: string;
  rawData: {
    parties: {
      id: string;
      name_in_agreement: string;
    }[];
    provisions: {
      effective_date: string;
      expiration_date: string;
      total_agreement_value: number;
      total_agreement_value_currency_code: string;
      payment_terms_due_date: string;
      can_charge_late_payment_fees: boolean;
      late_payment_fee_percent: number;
      termination_period_for_convenience: string;
    };
    languages: string[];
    metadata: {
      created_at: string;
      modified_at: string;
    };
  };
}
