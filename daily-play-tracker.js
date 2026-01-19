/**
 * Daily Play Tracker - Manages "once per day" restriction for Wordle
 * Uses both localStorage AND cookies to prevent multiple plays
 */

const STORAGE_KEY = 'wordle_last_play';
const COOKIE_NAME = 'wordle_last_play';
const GAME_STATE_KEY = 'wordle_game_state';

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
  
  // Build cookie string with Secure flag for HTTPS
  let cookieString = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  
  // Add Secure flag if using HTTPS
  if (window.location.protocol === 'https:') {
    cookieString += ';Secure';
  }
  
  document.cookie = cookieString;
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
    localStorage.removeItem(GAME_STATE_KEY);
  } catch (e) {
    // Silent fail
  }
  
  // Clear cookie by setting expired date with same flags used when setting
  let cookieString = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;
  if (window.location.protocol === 'https:') {
    cookieString += ';Secure';
  }
  document.cookie = cookieString;
}

/**
 * Saves the game state (guesses and keyboard state) to localStorage
 */
export function saveGameState(gameState) {
  try {
    const stateToSave = {
      guesses: gameState.guesses,
      keyboardState: gameState.keyboardState,
      gameState: gameState.gameState,
      targetWordData: gameState.targetWordData,
      date: getTodayDateString()
    };
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(stateToSave));
    return true;
  } catch (e) {
    console.warn('Failed to save game state:', e);
    return false;
  }
}

/**
 * Loads the saved game state from localStorage
 * Returns null if no state exists or if it's from a different day
 */
export function loadGameState() {
  try {
    const saved = localStorage.getItem(GAME_STATE_KEY);
    if (!saved) return null;
    
    const state = JSON.parse(saved);
    const today = getTodayDateString();
    
    // Only return state if it's from today
    if (state.date === today) {
      return state;
    }
    
    // Clear old state
    localStorage.removeItem(GAME_STATE_KEY);
    return null;
  } catch (e) {
    console.warn('Failed to load game state:', e);
    return null;
  }
}
