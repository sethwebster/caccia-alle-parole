import type { ReactNode } from 'react';

import { Balloon } from '@caccia/mobile';

const frame = (children: ReactNode) => (
  <div
    style={{
      padding: 20,
      background: '#F8EFE2',
      borderRadius: 22,
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    {children}
  </div>
);

/** Fresh round — small deflated balloon, all six lives intact. */
export const Integro = () => frame(<Balloon mistakes={0} />);

/** Halfway through — three wrong guesses, balloon visibly inflated. */
export const TreErrori = () => frame(<Balloon mistakes={3} />);

/** Sixth mistake — the balloon has burst: POP! */
export const Scoppiato = () => frame(<Balloon mistakes={6} />);
