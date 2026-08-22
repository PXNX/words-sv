export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.C3-pFZf3.js",app:"_app/immutable/entry/app.C_mgjzmf.js",imports:["_app/immutable/entry/start.C3-pFZf3.js","_app/immutable/chunks/CSd55BdA.js","_app/immutable/chunks/CEJkQP3h.js","_app/immutable/entry/app.C_mgjzmf.js","_app/immutable/chunks/CEJkQP3h.js","_app/immutable/chunks/BTnt9lWm.js","_app/immutable/chunks/DBZZnxsY.js","_app/immutable/chunks/Dp8uYXE0.js","_app/immutable/chunks/DxcBhicA.js","_app/immutable/chunks/CNdcWhP4.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
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
