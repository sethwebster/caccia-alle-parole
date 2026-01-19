/**
 * Daily Play Tracker - Manages "once per day" restriction for Wordle
 * Uses both localStorage AND cookies to prevent multiple plays
 */

const STORAGE_KEY = 'wordle_last_play';
const COOKIE_NAME = 'wordle_last_play';

/**
 * Gets the current date as a string (UTC) in format YYYY-MM-DD
 */
function getTodayDateString() {
  const today = new Date();
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Gets a value from localStorage
 */
function getFromLocalStorage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn('localStorage not available:', e);
    return null;
  }
}

/**
 * Sets a value in localStorage
 */
function setInLocalStorage(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch (e) {
    console.warn('localStorage not available:', e);
    return false;
  }
}

/**
 * Gets a cookie value by name
 */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return null;
}

/**
 * Sets a cookie with a value and expiration
 */
function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Checks if the user has already played today
 * Returns true if already played, false if can play
 */
export function hasPlayedToday() {
  const today = getTodayDateString();
  
  // Check localStorage
  const localStorageDate = getFromLocalStorage();
  if (localStorageDate === today) {
    return true;
  }
  
  // Check cookie
  const cookieDate = getCookie(COOKIE_NAME);
  if (cookieDate === today) {
    return true;
  }
  
  return false;
}

/**
 * Records that the user has played today
 * Stores in both localStorage and cookies
 */
export function markAsPlayedToday() {
  const today = getTodayDateString();
  
  // Store in localStorage
  setInLocalStorage(today);
  
  // Store in cookie (expires in 2 days to be safe)
  setCookie(COOKIE_NAME, today, 2);
}

/**
 * Gets the last play date string or null if never played
 */
export function getLastPlayDate() {
  // Try localStorage first
  const localDate = getFromLocalStorage();
  if (localDate) return localDate;
  
  // Try cookie
  const cookieDate = getCookie(COOKIE_NAME);
  if (cookieDate) return cookieDate;
  
  return null;
}

/**
 * Clears play tracking (useful for testing/debugging)
 * WARNING: Should not be exposed in production UI
 */
export function clearPlayTracking() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Silent fail
  }
  
  // Clear cookie by setting expired date
  document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}
