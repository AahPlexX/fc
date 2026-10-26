import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/tokens.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("OmniConvert could not find the application root element.");
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
	void navigator.serviceWorker
		.register("/sw.js", { scope: "/" })
		.then(() => navigator.serviceWorker.ready)
		.then((registration) => {
			// The worker checks its own activation state. A page-side worker wrapper
			// can retain an outdated state when navigation overlaps activation.
			registration.active?.postMessage("OMNICONVERT_CLAIM_CLIENTS");
		})
		.catch(() => {
			// Offline support is an enhancement; failures do not block conversion.
		});
}
