/**
 * `?kiosk` in the URL marks the big screen in the office. Its laptop has little memory and a
 * weak GPU, so the graph draws without antialiasing at one pixel per CSS pixel, panels skip
 * the background blur, and the page starts afresh more often.
 */
export const KIOSK = new URLSearchParams(location.search).has("kiosk");
