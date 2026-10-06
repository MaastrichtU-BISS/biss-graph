import { theme } from "../../i18n";

// Legacy showcase canvases are inverted by ShowcaseStage in light mode. Draw
// paper surfaces and their ink in inverse source colors so they read as paper
// after that filter, while the original dark-theme art stays unchanged.
export const paper = () => theme.value === "light" ? "#000" : "#fff";
export const paperInk = () => theme.value === "light" ? "#f0f0f0" : "#111";
export const paperMuted = () => theme.value === "light" ? "#b5b5b5" : "#4b4b4b";
export const paperLine = () => theme.value === "light" ? "#333" : "#d1d5db";
export const paperInset = () => theme.value === "light" ? "#141414" : "#f1f5f9";
