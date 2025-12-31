// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			user: {
				id: string;
				email: string;
				name: string | null;
				role: string;
				companyId: string;
				companyName: string;
			} | null;
		}
		interface PageData {
			session: {
				user: {
					id: string;
					email: string;
					name: string | null;
					role: string;
					companyId: string;
					companyName: string;
				} | null;
			} | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
