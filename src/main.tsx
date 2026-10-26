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
			const worker = registration.active;
			if (!worker) return;
			const requestControl = () => {
				if (worker.state !== "activated" && worker.state !== "redundant")
					return;
				worker.removeEventListener("statechange", requestControl);
				if (worker.state === "activated") {
					try {
						worker.postMessage("OMNICONVERT_CLAIM_CLIENTS");
					} catch {
						// Offline support remains an optional enhancement.
					}
				}
			};
			worker.addEventListener("statechange", requestControl);
			requestControl();
		})
		.catch(() => {
			// Offline support is an enhancement; failures do not block conversion.
		});
}
