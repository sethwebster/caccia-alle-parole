import type { ReactNode } from 'react';

import { DailyThemeCard } from '@caccia/mobile';

const frame = (children: ReactNode) => (
  <div style={{ padding: 20, background: '#F8EFE2', borderRadius: 22, width: 400 }}>
    {children}
  </div>
);

const CHOICES = ['Erbe aromatiche', 'Città di mare', 'Strumenti musicali', 'Dolci delle feste'];

const model = (theme: unknown) =>
  ({ kind: 'ready', challengeId: '2026-07-12', theme }) as never;

/** Challenge finished, quiz still unanswered — reveal button visible. */
export const QuizAperto = () =>
  frame(
    <DailyThemeCard
      model={model({
        gate: 'unlocked',
        status: 'unanswered',
        title: 'Indovina il tema nascosto',
        body: 'Hai concluso la sfida: scegli con calma il legame che univa i giochi.',
        prompt: 'Quale filo comune univa le parole di oggi?',
        choices: CHOICES,
      })}
      onAnswerTheme={() => {}}
    />,
  );

/** Correct answer feedback on the success surface. */
export const RispostaEsatta = () =>
  frame(
    <DailyThemeCard
      model={model({
        gate: 'unlocked',
        status: 'answered',
        title: 'Tema svelato: Erbe aromatiche',
        body: 'Scelta perfetta: hai riconosciuto il filo comune.',
        prompt: 'Quale filo comune univa le parole di oggi?',
        choices: CHOICES,
        selectedAnswerIndex: 0,
        selectedChoice: 'Erbe aromatiche',
        correctChoice: 'Erbe aromatiche',
        isCorrect: true,
        feedbackTitle: 'Risposta esatta',
        explanation: 'Basilico, salvia, rosmarino, timo e origano: tutte erbe del giardino mediterraneo.',
      })}
      onAnswerTheme={() => {}}
    />,
  );

/** Wrong answer feedback — amber surface with the right solution shown. */
export const RispostaSbagliata = () =>
  frame(
    <DailyThemeCard
      model={model({
        gate: 'unlocked',
        status: 'answered',
        title: 'Tema svelato: Erbe aromatiche',
        body: 'Risposta salvata: ecco il filo comune corretto.',
        prompt: 'Quale filo comune univa le parole di oggi?',
        choices: CHOICES,
        selectedAnswerIndex: 1,
        selectedChoice: 'Città di mare',
        correctChoice: 'Erbe aromatiche',
        isCorrect: false,
        feedbackTitle: 'Tema corretto: Erbe aromatiche',
        explanation: 'Basilico, salvia, rosmarino, timo e origano: tutte erbe del giardino mediterraneo.',
      })}
      onAnswerTheme={() => {}}
    />,
  );

/** Theme gate still locked — challenge not finished yet. */
export const TemaBloccato = () =>
  frame(
    <DailyThemeCard
      model={model({
        gate: 'locked',
        title: 'Tema nascosto custodito',
        body: 'Completa tutti e cinque i giochi per sbloccare il filo comune di oggi.',
      })}
      onAnswerTheme={() => {}}
    />,
  );
