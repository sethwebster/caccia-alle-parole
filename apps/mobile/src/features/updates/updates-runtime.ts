import * as Updates from 'expo-updates';

/**
 * checkForUpdateAsync and fetchUpdateAsync reject outright in dev builds and
 * Expo Go, so anything that drives them stays hidden there rather than offering
 * the player a control that can only fail.
 */
export const UPDATES_ENABLED = Updates.isEnabled && !__DEV__;
