import {writable} from 'svelte/store';
import { ApiRoot,loadAll} from '$lib/utils/stores';
import axios from 'axios';

export const user = writable(null);

export async function refreshUser() {
    try{
		const url = `${ApiRoot}user/`;
		const response = await axios.get(url, {
			withCredentials: true,
			validateStatus: () => true,
		});

		user.set(response.status >= 200 && response.status <= 300 ? response.data : null);
		await loadAll();
	}catch{
		user.set(null);
	}
}

export async function logout() {
    try{
		const api : string = `${ApiRoot}auth/logout`;
		const response = await axios(api, {
			method: "GET",
			withCredentials: true,
			validateStatus: () => true,
		});
		if(response.status >= 200 && response.status <= 300){
            user.set(null);
			console.log('Logout successfully.(from auth.ts)');
		}else{
			console.log(`Log out failed with status : ${response.status}`);
		}
	}catch(e){
		alert(`An error occured during logout : ${e}`); //Only dev
	}
}