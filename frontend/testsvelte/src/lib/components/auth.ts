import {writable} from 'svelte/store';
import { ApiRoot,loadAll} from '$lib/utils/stores';

export const user = writable(null);

export async function refreshUser() {
    try{
		const url = `${ApiRoot}user/`;
		const response = await fetch(url, {
			credentials : 'include'
		});
		user.set(response.ok? await response.json() : null);
		await loadAll();
	}catch{
		user.set(null);
	}
}

export async function logout() {
    try{
		const api : string = `${ApiRoot}auth/logout`;
		const response = await fetch(api, {credentials : 'include'});
		if(response.ok){
            user.set(null);
			console.log('Logout successfully.(from auth.ts)');
		}else{
			console.log(`Log out failed with status : ${response.status}`);
		}
	}catch(e){
		alert(`An error occured during logout : ${e}`); //Only dev
	}
}