
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/caccia" | "/parola";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/caccia": Record<string, never>;
			"/parola": Record<string, never>
		};
		Pathname(): "/" | "/caccia" | "/caccia/" | "/parola" | "/parola/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/fonts/poppins/poppins-400.woff2" | "/fonts/poppins/poppins-500.woff2" | "/fonts/poppins/poppins-600.woff2" | "/fonts/poppins/poppins-700.woff2" | string & {};
	}
}