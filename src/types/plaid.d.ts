declare module 'plaid' {
  export interface ConfigurationParams {
    basePath: string;
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': string;
        'PLAID-SECRET': string;
      };
    };
  }

  export class Configuration {
    constructor(params: ConfigurationParams);
    basePath: string;
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': string;
        'PLAID-SECRET': string;
      };
    };
  }

  export class PlaidApi {
    constructor(configuration: Configuration);
    linkTokenCreate(params: any): Promise<{ data: { link_token: string } }>;
    itemPublicTokenExchange(params: { public_token: string }): Promise<{ data: { access_token: string; item_id: string } }>;
    transactionsGet(params: { access_token: string; start_date: string; end_date: string }): Promise<{ data: { transactions: any[] } }>;
    accountsBalanceGet(params: { access_token: string }): Promise<{ data: { accounts: any[] } }>;
  }

  export const PlaidEnvironments: {
    [key: string]: string;
    sandbox: string;
    development: string;
    production: string;
  };
}