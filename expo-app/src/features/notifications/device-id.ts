import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY = 'notifications/device-id';

/** Stable anonymous id for this install; minted on first use. */
export async function getDeviceIdAsync(): Promise<string> {
	const existing = await AsyncStorage.getItem(KEY);
	if (existing) return existing;
	const id = Crypto.randomUUID();
	await AsyncStorage.setItem(KEY, id);
	return id;
}
