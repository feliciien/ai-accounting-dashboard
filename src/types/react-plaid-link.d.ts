declare module 'react-plaid-link' {
  export interface PlaidLinkOptions {
    token: string;
    onSuccess: (public_token: string, metadata: any) => void;
    onExit?: () => void;
    onEvent?: (eventName: string, metadata: any) => void;
    onLoad?: () => void;
  }

  export interface PlaidLinkProps extends PlaidLinkOptions {
    className?: string;
    children?: React.ReactNode;
  }

  export interface UsePlaidLinkResponse {
    open: () => void;
    ready: boolean;
    error: Error | null;
  }

  export function usePlaidLink(options: PlaidLinkOptions): UsePlaidLinkResponse;
  export function PlaidLink(props: PlaidLinkProps): JSX.Element;
}