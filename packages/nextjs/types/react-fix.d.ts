// Fix for React type conflicts
declare module 'react' {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
  }
}

declare global {
  namespace React {
    type ReactNode = import('react').ReactNode;
  }
}

export {};