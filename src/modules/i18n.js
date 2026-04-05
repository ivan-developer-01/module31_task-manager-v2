import i18next from "i18next";
import HttpBackend from "i18next-http-backend";
export const USER_LANGUAGE = navigator.language.slice(0, 2);

let i18nPromise;

export default function init() {
	if (!i18nPromise) {
		i18nPromise = i18next.use(HttpBackend).init({
			fallbackLng: false,
			backend: { loadPath: "/locales/{{lng}}/translations.json" },
		});
	}
	return i18nPromise;
}

await init();
i18next.changeLanguage(USER_LANGUAGE);
i18next.on("languageChanged", () => {
	translatePage();
});

export function t(key, defaultValue, options) {
	return i18next.t(key, { defaultValue, ...options });
}

export function changeLanguage(language) {
	i18next.changeLanguage(language);
}

function translatePage() {
	const elements = document.querySelectorAll(
		"[data-i18n], [data-i18n-placeholder]",
	);
	elements.forEach((el) => {
		translateElement(el);
	});
}

translatePage();

function translateElement(el) {
	const key = el.dataset.i18n;
	if (key) el.textContent = t(key, el.textContent);
	const placeholderKey = el.dataset.i18nPlaceholder;
	if (placeholderKey) el.placeholder = t(placeholderKey, el.placeholder);
}

function translateAddedNodes(nodes) {
	nodes.forEach((node) => {
		if (node.nodeType === Node.ELEMENT_NODE) {
			translateElement(node);
			node
				.querySelectorAll?.("[data-i18n], [data-i18n-placeholder]")
				.forEach(translateElement);
		}
	});
}

const observer = new MutationObserver((mutations) => {
	mutations.forEach((mutation) => {
		if (mutation.addedNodes.length) translateAddedNodes(mutation.addedNodes);
	});
});

observer.observe(document.body, { childList: true, subtree: true });
