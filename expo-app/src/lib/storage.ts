import AsyncStorage from '@react-native-async-storage/async-storage';

export async function loadJSON<T>(key: string): Promise<T | null> {
	try {
		const raw = await AsyncStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
	try {
		await AsyncStorage.setItem(key, JSON.stringify(value));
	} catch {
		// storage is best-effort; gameplay must not depend on it
	}
}

export async function removeKey(key: string): Promise<void> {
	try {
		await AsyncStorage.removeItem(key);
	} catch {
		// ignore
	}
}
