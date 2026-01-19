export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["fonts/poppins/poppins-400.woff2","fonts/poppins/poppins-500.woff2","fonts/poppins/poppins-600.woff2","fonts/poppins/poppins-700.woff2"]),
	mimeTypes: {".woff2":"font/woff2"},
	_: {
		client: {start:"_app/immutable/entry/start.BqiYUY_5.js",app:"_app/immutable/entry/app.C8WWYAU_.js",imports:["_app/immutable/entry/start.BqiYUY_5.js","_app/immutable/chunks/D7MlYf4B.js","_app/immutable/chunks/CBuEwPee.js","_app/immutable/chunks/C2gPXALa.js","_app/immutable/entry/app.C8WWYAU_.js","_app/immutable/chunks/CBuEwPee.js","_app/immutable/chunks/Cd6EgHsT.js","_app/immutable/chunks/C-7M-uPP.js","_app/immutable/chunks/C2gPXALa.js","_app/immutable/chunks/DZ8b0oBY.js","_app/immutable/chunks/BoCClklL.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/caccia",
				pattern: /^\/caccia\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/parola",
				pattern: /^\/parola\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
