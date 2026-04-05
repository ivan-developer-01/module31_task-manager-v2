import { changeLanguage, USER_LANGUAGE } from "./i18n";

const currentLanguage = localStorage.getItem("language") || USER_LANGUAGE;
changeLanguage(currentLanguage);
document.addEventListener("DOMContentLoaded", () => {
	const languageSelect = document.querySelector(".language-select");
	languageSelect.value = currentLanguage;
});

document.addEventListener("change", (event) => {
	let select;
	if ((select = event.target.closest(".language-select"))) {
		changeLanguage(select.value);
		localStorage.setItem("language", select.value);
	}
});
