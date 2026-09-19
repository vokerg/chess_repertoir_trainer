import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        piece: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
      }
    }
  }
}

export {};
