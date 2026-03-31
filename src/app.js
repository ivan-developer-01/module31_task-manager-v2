import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.css";
import taskFieldTemplate from "./templates/taskField.html";
import noAccessTemplate from "./templates/noAccess.html";
import profileSettingsTemplate from "./templates/profile-settings.html";
import loggedOutTemplate from "./templates/header/loggedOut.html";
import loggedInTemplate from "./templates/header/loggedIn.html";
import Swal from "sweetalert2";
import { User } from "./models/User";
import { generateTestUser } from "./utils";
import { State } from "./state";
import { authUser } from "./services/auth";
import { toggleTasksCounter, updateTasksCounter } from "./tasksCounter";
import { Task } from "./models/Task";
const headerRight = document.querySelector("#header-right");
headerRight.innerHTML = loggedOutTemplate;
export let backlogTasksDiv = null;
export let backlogTasksUl = null;
export let readyTasksDiv = null;
export let readyTasksUl = null;
export let inProgressTasksDiv = null;
export let inProgressTasksUl = null;
export let finishedTasksDiv = null;
export let finishedTasksUl = null;
let addInputWrapper = null,
	addInput = null,
	backlogAddButton = null,
	backlogSubmitButton = null;
const contentDiv = document.querySelector("#content");
const originalContentDivHTML = contentDiv.innerHTML;
// Map<destination, source>
const taskCategoryRelationships = new Map([
	["ready", "backlog"],
	["in-progress", "ready"],
	["finished", "in-progress"],
]);

export const appState = new State();

const loginForm = document.querySelector("#app-login-form");

if (!localStorage.getItem("users")) generateTestUser(User);

function queryElements() {
	backlogTasksDiv = contentDiv.querySelector("[data-group=backlog]");
	backlogTasksUl = backlogTasksDiv.querySelector(".task-list");
	readyTasksDiv = contentDiv.querySelector("[data-group=ready]");
	readyTasksUl = readyTasksDiv.querySelector(".task-list");
	inProgressTasksDiv = contentDiv.querySelector("[data-group=in-progress]");
	inProgressTasksUl = inProgressTasksDiv.querySelector(".task-list");
	finishedTasksDiv = contentDiv.querySelector("[data-group=finished]");
	finishedTasksUl = finishedTasksDiv.querySelector(".task-list");

	backlogAddButton = backlogTasksDiv.querySelector(".task-add-button");
	backlogSubmitButton = backlogTasksDiv.querySelector(".task-submit-button");
	addInputWrapper = contentDiv.querySelector(".add-input-wrapper");
	addInput = addInputWrapper.querySelector(".add-input");
}

document.addEventListener("submit", function (event) {
	if (event.target.matches("#app-login-form")) {
		event.preventDefault();
		const formData = new FormData(event.target);
		const login = formData.get("login");
		const password = formData.get("password");
		const isAuthenticated = authUser(login, password);

		let fieldHTMLContent = isAuthenticated
			? taskFieldTemplate
			: noAccessTemplate;

		contentDiv.innerHTML = fieldHTMLContent;

		if (isAuthenticated) {
			headerRight.innerHTML = loggedInTemplate;
			toggleTasksCounter();
			appState.tasks = Task.getTasks();
			queryElements();
			renderTasks(appState.tasks);
			updateTasksCounter();
		}
	} else if (event.target.matches("#profile-edit-form")) {
		event.preventDefault();
		const formData = new FormData(event.target);
		let isValid = true;

		const {
			login: loginInput,
			"current-password": currentPasswordInput,
			"new-password": newPasswordInput,
			"confirm-new-password": confirmNewPasswordInput,
		} = event.target.elements;
		const [login, currentPassword, newPassword, newPasswordConfirmation] =
			formData.values();
		if (login === appState.currentUser.login && !newPassword) {
			Swal.fire("You have not changed anything; aborting.");
			return;
		}

		function invalidate(input, message) {
			isValid = false;
			input.setCustomValidity(message);
		}

		if (!login) {
			invalidate(loginInput, "The login must not be empty.");
		}
		if (newPassword) {
			if (!currentPassword) {
				invalidate(
					currentPasswordInput,
					"You must confirm your current password to change it.",
				);
			} else if (currentPassword !== appState.currentUser.password) {
				invalidate(
					currentPasswordInput,
					"The provided password does not match your password.",
				);
			} else if (!newPasswordConfirmation) {
				invalidate(
					confirmNewPasswordInput,
					"You must confirm your new password.",
				);
			} else if (newPassword !== newPasswordConfirmation) {
				invalidate(confirmNewPasswordInput, "Both passwords should match.");
			}
		}

		if (isValid) {
			// It seems we are finally good to go (phew, that was a lot of validation).
			const changedProperties = [];
			if (login !== appState.currentUser.login) {
				appState.currentUser.login = login;
				changedProperties.push("login");
			}
			if (newPassword) {
				appState.currentUser.password = newPassword;
				changedProperties.push("password");
			}
			User.update(appState.currentUser.id, appState.currentUser);
			Swal.fire(
				`Successfully changed your ${changedProperties.join(" and ")}`,
			).then(() => renderTaskFieldTemplate());
		}
	}
});

document.body.addEventListener(
	"blur",
	(event) => {
		if (
			event.target === addInput &&
			!addInputWrapper.classList.contains("d-none")
		) {
			handleTaskSubmit(event.target);
		}
	},
	true,
);

document.body.addEventListener("keyup", (event) => {
	if (event.target === addInput) {
		if (["enter", "return"].includes(event.key.toLowerCase())) {
			handleTaskSubmit(event.target);
		}
	}

	let editPopup;
	if (
		event.key.toLowerCase() === "escape" &&
		(editPopup = contentDiv.querySelector("#task-edit-popup.active"))
	) {
		handlePopupAction(editPopup, "cancel");
	}
});

document.body.addEventListener("click", (event) => {
	if (event.target === backlogAddButton) {
		if (addInputWrapper.classList.contains("d-none")) {
			addInputWrapper.classList.remove("d-none");
		}
		addInput.focus();
		backlogAddButton.classList.add("d-none");
		backlogSubmitButton.classList.remove("d-none");
	} else if (event.target.matches(".task-add-button")) {
		// Populate the select with valid options
		const sourceCategory = taskCategoryRelationships.get(
			event.target.closest(".task-group").dataset.group,
		);
		const sourceTasks = appState.tasks.filter(
			(task) => task.category === sourceCategory,
		);
		const select = event.target.previousElementSibling;
		function createOption(value, content, disabled = false, selected = false) {
			const option = document.createElement("option");
			option.value = value;
			option.textContent = content;
			if (disabled) option.disabled = "disabled";
			if (selected) option.selected = "selected";
			return option;
		}
		const options = [createOption("", "Select a task...", true, true)];
		for (const task of sourceTasks) {
			options.push(createOption(task.id, task.title));
		}

		select.innerHTML = "";
		select.append(...options);
		select.classList.remove("d-none");
		event.target.classList.add("d-none");
	} else if (
		event.target !== addInput &&
		!addInputWrapper?.classList.contains("d-none") &&
		appState.currentUser
	) {
		handleTaskSubmit(addInput);
	}

	let userMenu = headerRight.querySelector(".user-menu"),
		userContextmenu = userMenu?.querySelector(".user-contextmenu");
	if (
		event.target.closest(".user-menu") &&
		!event.target.closest(".user-contextmenu")
	) {
		userMenu.classList.toggle("active");
		userContextmenu.classList.toggle("d-none");
	} else {
		userMenu?.classList.remove("active");
		userContextmenu?.classList.add("d-none");
		if (event.target.matches(".contextmenu-item")) {
			const { action } = event.target.dataset;
			switch (action) {
				case "tasks":
					renderTaskFieldTemplate();
					break;
				case "profile":
					contentDiv.innerHTML = profileSettingsTemplate;
					const loginInput = contentDiv.querySelector("#login-input");
					loginInput.value = appState.currentUser.login;
					break;
				case "logout":
					appState.currentUser = null;
					headerRight.innerHTML = loggedOutTemplate;
					contentDiv.innerHTML = originalContentDivHTML;
					toggleTasksCounter();
					break;
				default:
					alert(`Unknown action ${action}`);
					break;
			}
		}
	}

	if (
		event.target.closest("#profile-edit-form") &&
		(event.target.matches(".cancel-btn") || event.target.matches(".back-btn"))
	) {
		renderTaskFieldTemplate();
	}

	let taskElement;
	if ((taskElement = event.target.closest(".task"))) {
		showEditPopup(
			taskElement.textContent,
			taskElement.dataset.description,
			taskElement.dataset.id,
		);
	}

	let editPopup, popupAction;
	if (
		(editPopup = event.target.closest("#task-edit-popup")) &&
		(popupAction = event.target.dataset.action)
	) {
		handlePopupAction(editPopup, popupAction);
	}
});

document.body.addEventListener("change", (event) => {
	let select;
	if ((select = event.target.closest("select"))) {
		const taskId = select.value;
		// Handle changing the task category.
		const newTaskCategory = select.closest(".task-group").dataset.group;
		select.classList.add("d-none");
		select
			.closest(".task-group-controls")
			.querySelector(".task-add-button")
			.classList.remove("d-none");
		Task.update(taskId, {
			category: newTaskCategory,
		});

		renderTasks(appState.tasks);
		updateTasksCounter();
	}
});

document.body.addEventListener("input", (event) => {
	let profileEditForm;
	if (
		event.target.tagName === "INPUT" &&
		(profileEditForm = event.target.closest("#profile-edit-form"))
	) {
		for (const input of Array.from(profileEditForm.elements).filter(
			(element) => element.tagName === "INPUT",
		)) {
			input.setCustomValidity("");
			input.reportValidity();
		}
	}
});

toggleTasksCounter();

function handlePopupAction(popup, action) {
	const elements = getEditPopupElements(popup);
	const title = elements.titleElement.textContent;
	const description = elements.descriptionTextarea.value;
	const taskId = elements.taskIdInput.value;
	switch (action) {
		case "cancel":
		case "close":
			popup.classList.remove("active");
			break;
		case "save":
			if (!title) {
				Swal.fire({
					icon: "error",
					title: "Error",
					text: "Task title cannot be empty!",
				});
			} else {
				Task.update(taskId, { title, description });
				handlePopupAction(popup, "close");
				renderTasks(appState.tasks);
			}
			break;
		case "delete":
			Swal.fire({
				title: `Are you sure yodl;gjku want to delete "${title}"?`,
				showDenyButton: true,
				confirmButtonText: "Delete",
				denyButtonText: "No, keep it",
				reverseButtons: true,
				customClass: {
					confirmButton: "btn btn-danger",
					denyButton: "btn btn-primary",
				},
			}).then((result) => {
				if (result.isConfirmed) {
					Task.delete(taskId);
					handlePopupAction(popup, "close");
					renderTasks(appState.tasks);
				}
			});
			break;
		default:
			alert(`Unknown popup action ${action}!`);
	}
}

function getEditPopupElements(editPopup) {
	return {
		titleElement: editPopup.querySelector(".popup-title"),
		descriptionTextarea: editPopup.querySelector(".popup-description"),
		taskIdInput: editPopup.querySelector("#popup-edit-task-id"),
	};
}

function showEditPopup(taskTitle, taskDescription, taskId) {
	const editPopup = contentDiv.querySelector("#task-edit-popup");
	if (!editPopup) throw new Error("Edit popup not found.");
	const popupElements = getEditPopupElements(editPopup);
	popupElements.titleElement.textContent = taskTitle;
	popupElements.descriptionTextarea.value = taskDescription;
	popupElements.taskIdInput.value = taskId;
	editPopup.classList.add("active");
}

function renderTaskFieldTemplate() {
	contentDiv.innerHTML = taskFieldTemplate;
	queryElements();
	renderTasks(appState.tasks);
}

function renderTasks(tasks) {
	clearTasksDivs();
	const listItems = {
		backlog: [],
		ready: [],
		"in-progress": [],
		finished: [],
	};

	for (const task of tasks.filter((task) =>
		appState.currentUser.canReadTask(task),
	)) {
		const listItem = document.createElement("li");
		listItem.classList.add("task");
		listItem.textContent = task.title;
		listItem.dataset.description = task.description;
		listItem.dataset.id = task.id;
		listItems[task.category].push(listItem);
	}

	backlogTasksUl.append(...listItems.backlog);
	readyTasksUl.append(...listItems.ready);
	inProgressTasksUl.append(...listItems["in-progress"]);
	finishedTasksUl.append(...listItems.finished);

	// Juggle the disabled/active states of task add buttons.
	// note: no backlogTasksDiv here, since it should be always available
	for (const element of [readyTasksDiv, inProgressTasksDiv, finishedTasksDiv]) {
		const addTaskButton = element.querySelector(".task-add-button");
		const tasksUl = element.parentNode.querySelector(
			`.task-group[data-group=${taskCategoryRelationships.get(element.dataset.group)}] .task-list`,
		);

		if (!tasksUl.children.length) {
			addTaskButton.setAttribute("disabled", "disabled");
		} else {
			addTaskButton.removeAttribute("disabled");
		}
	}
}

function clearTasksDivs() {
	for (const element of [
		backlogTasksUl,
		readyTasksUl,
		inProgressTasksUl,
		finishedTasksUl,
	]) {
		element.innerHTML = "";
	}
}

function handleTaskSubmit(addInput) {
	const taskTitle = addInput.value.trim();
	if (!taskTitle) {
		// do nothing...
		// fallthrough
	} else {
		const task = new Task(taskTitle, "", "backlog", appState.currentUser.id);
		Task.save(task);
		appState.tasks.push(task);
		renderTasks(appState.tasks);
		updateTasksCounter();
	}

	addInputWrapper.classList.add("d-none");
	addInput.value = "";
	backlogAddButton.classList.remove("d-none");
	backlogSubmitButton.classList.add("d-none");
}
