import { OptionButton } from '@caccia/mobile';

/** Setup-screen category chips: default, active, disabled in one row. */
export const StatiChip = () => (
	<div
		style={{
			display: 'flex',
			gap: 10,
			alignItems: 'flex-start',
			padding: 20,
			background: '#F8EFE2',
			borderRadius: 22,
		}}
	>
		<OptionButton label="Animali" onPress={() => {}} />
		<OptionButton label="Cucina" active onPress={() => {}} />
		<OptionButton label="Geografia" disabled onPress={() => {}} />
	</div>
);

/** Difficulty picker row as it appears on the setup screen. */
export const SceltaDifficolta = () => (
	<div
		style={{
			display: 'flex',
			gap: 10,
			alignItems: 'flex-start',
			padding: 20,
			background: '#F8EFE2',
			borderRadius: 22,
		}}
	>
		<OptionButton label="Facile" onPress={() => {}} />
		<OptionButton label="Media" active onPress={() => {}} />
		<OptionButton label="Difficile" onPress={() => {}} />
	</div>
);
