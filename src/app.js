import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./styles/style.css";
// The following import must be in JS, otherwise you'll face a complex bug!
import "./styles/mobile.css";
import "drag-drop-touch";
import taskFieldTemplate from "./templates/taskField.html";
import noAccessTemplate from "./templates/noAccess.html";
import profileSettingsTemplate from "./templates/profileSettings.html";
import manageUsersTemplate from "./templates/manageUsers.html";
import loggedOutTemplate from "./templates/header/loggedOut.html";
import loggedInTemplate from "./templates/header/loggedIn.html";
import Swal from "sweetalert2";
import { User } from "./models/User";
import { generateFirstUsers } from "./utils";
import { State } from "./state";
import { authUser } from "./services/auth";
import { toggleTasksCounter, updateTasksCounter } from "./tasksCounter";
import { Task } from "./models/Task";
const headerRight = document.querySelector("#header-right");
headerRight.innerHTML = loggedOutTemplate;
let backlogTasksDiv = null,
	backlogTasksUl = null,
	readyTasksDiv = null,
	readyTasksUl = null,
	inProgressTasksDiv = null,
	inProgressTasksUl = null,
	finishedTasksDiv = null,
	finishedTasksUl = null,
	addInputWrapper = null,
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

const swal = Swal.mixin({
	customClass: {
		confirmButton: "btn btn-danger",
		denyButton: "btn btn-primary",
	},
});

// Generates first users on first page load.
function checkUsers() {
	const users = localStorage.getItem("users");
	if (!users || JSON.parse(users).length === 0) generateFirstUsers(User);
}

checkUsers();

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
			document.documentElement.classList.add("logged-in");
			document.documentElement.classList[
				appState.currentUser.role === "admin" ? "add" : "remove"
			]("is-admin");
			headerRight.innerHTML = loggedInTemplate;
			if (appState.currentUser.role === "admin") {
				const userContextmenu = headerRight.querySelector(".user-contextmenu");
				const listItem = document.createElement("li");
				listItem.classList.add("contextmenu-item");
				listItem.textContent = "Manage users";
				listItem.dataset.action = "manage-users";
				userContextmenu.prepend(listItem);
			}

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
			swal.fire("You have not changed anything; aborting.");
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
			swal
				.fire(`Successfully changed your ${changedProperties.join(" and ")}`)
				.then(() => renderTaskFieldTemplate());
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
			(task) =>
				appState.currentUser.canReadTask(task) &&
				task.category === sourceCategory,
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
				case "manage-users":
					contentDiv.innerHTML = manageUsersTemplate;
					initManageUsers();
					break;
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
					document.documentElement.classList.remove("logged-in");
					document.documentElement.classList.remove("is-admin");
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

	let manageUsersAction;
	if (
		event.target.closest("#manage-users") &&
		(manageUsersAction = event.target.dataset.action)
	) {
		function promptCreateUser(role) {
			return new Promise(async (resolve, reject) => {
				const sharedConfig = {
					showCancelButton: true,
					inputValidator: (value) => {
						if (!value) return `The new ${role}'s login cannot be empty.`;
					},
				};

				const loginPromptResult = await swal.fire({
					titleText: `Enter the new ${role}'s login`,
					input: "text",
					inputLabel: `Enter login:`,
					...sharedConfig,
				});
				if (loginPromptResult.isDismissed) {
					reject();
					return;
				}

				const passwordPromptResult = await swal.fire({
					titleText: `Enter ${loginPromptResult.value}'s password`,
					input: "password",
					inputLabel: `Enter password:`,
					...sharedConfig,
				});
				if (passwordPromptResult.isDismissed) {
					reject();
					return;
				}

				resolve({
					login: loginPromptResult.value,
					password: passwordPromptResult.value,
				});
			});
		}
		function handleNewUser(role, { login, password }) {
			const user = new User(login, password, role);
			User.save(user);
			initManageUsers();
		}
		switch (manageUsersAction) {
			case "delete-user":
				const userId = event.target.dataset.id;
				let userDeletingThemselves = false;
				if (userId === appState.currentUser.id) userDeletingThemselves = true;

				const listItem = event.target.closest(".user-list-item");
				const userRole = listItem.dataset.role;
				const userLogin =
					listItem.querySelector(".user-list-login").textContent;

				const userPresentation = userDeletingThemselves
					? "<b>yourself</b>"
					: `the ${userRole} '${userLogin}'`;
				swal
					.fire({
						title: "Confirm deletion",
						[userDeletingThemselves ? "html" : "text"]:
							`Are you really sure you want to delete ${userPresentation}?`,
						icon: "question",
						showDenyButton: true,
						confirmButtonText: "Delete",
						denyButtonText: "No, keep",
						reverseButtons: true,
					})
					.then((result) => {
						if (result.isConfirmed) {
							User.delete(userId);
							initManageUsers();
						}
					});
				break;
			case "add-user":
				// prettier-ignore
				promptCreateUser("user").then((result) => handleNewUser("user", result));
				break;
			case "add-admin":
				// prettier-ignore
				promptCreateUser("admin").then((result) => handleNewUser("admin", result));
				break;
			default:
				alert(`Unknown action ${manageUsersAction}!`);
				break;
		}
	}
});

document.body.addEventListener("change", (event) => {
	let select;
	if ((select = event.target.closest("select"))) {
		const taskId = select.value;
		if (!appState.currentUser.canReadTask(Task.get(taskId))) {
			swal.fire({
				title: "Error",
				titleText: "You can't move a task you can't see.",
				icon: "error",
			});
			return;
		}
		// Handle changing the task category.
		const newTaskCategory = select.closest(".task-group").dataset.group;
		select.classList.add("d-none");
		select
			.closest(".task-group-controls")
			.querySelector(".task-add-button")
			.classList.remove("d-none");
		Task.update(
			taskId,
			{
				category: newTaskCategory,
			},
			{ splice: true },
		);

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

// Map<source, destination[]>
const validTaskDropDestinations = new Map([
	["backlog", new Set(["ready"])],
	["ready", new Set(["backlog", "in-progress"])],
	["in-progress", new Set(["ready", "finished"])],
	["finished", new Set(["in-progress"])],
]);

function isValidDropTarget(event, taskGroupElement) {
	const sourceCategory = event.dataTransfer.getData("taskCategory");
	const destinationCategory = taskGroupElement.dataset.group;
	const validDestinations = validTaskDropDestinations.get(sourceCategory);
	return validDestinations.has(destinationCategory);
}

document.body.addEventListener("dragstart", (event) => {
	let taskListItem;
	if ((taskListItem = event.target.closest(".task"))) {
		const taskCategory = event.target.closest(".task-group").dataset.group;
		event.dataTransfer.setData("taskId", taskListItem.dataset.id);
		event.dataTransfer.setData("taskCategory", taskCategory);
	}
});

document.body.addEventListener("dragover", (event) => {
	let taskGroupElement;
	if (
		(taskGroupElement = event.target.closest(".task-group")) &&
		isValidDropTarget(event, taskGroupElement)
	) {
		event.preventDefault();
		taskGroupElement.classList.add("task-dropzone");
	}
});

document.body.addEventListener("dragleave", (event) => {
	let taskGroupElement;
	if ((taskGroupElement = event.target.closest(".task-group"))) {
		taskGroupElement.classList.remove("task-dropzone");
	}
});

document.body.addEventListener("drop", (event) => {
	// event.preventDefault();
	let taskGroupElement;
	if ((taskGroupElement = event.target.closest(".task-group"))) {
		taskGroupElement.classList.remove("task-dropzone");
		const taskId = event.dataTransfer.getData("taskId");
		const destinationCategory = taskGroupElement.dataset.group;
		if (isValidDropTarget(event, taskGroupElement)) {
			Task.update(
				taskId,
				{
					category: destinationCategory,
				},
				{ splice: true },
			);
			renderTasks(appState.tasks);
		}
	}
});

toggleTasksCounter();

function initManageUsers() {
	const usersList = contentDiv.querySelector(".user-list[data-role=user]"),
		adminsList = contentDiv.querySelector(".user-list[data-role=admin]");
	for (const list of [usersList, adminsList]) {
		list.innerHTML = "";
	}

	const users = [],
		admins = [];
	for (const user of User.getUsers()) {
		if (user.role === "user") users.push(user);
		else if (user.role === "admin") admins.push(user);
		else users.push(user);
	}

	function getListItems(usersArray) {
		return usersArray.map((user) => {
			const listItem = document.createElement("li");
			listItem.dataset.role = user.role;
			listItem.classList.add("user-list-item");

			const loginSpan = document.createElement("span");
			loginSpan.classList.add("user-list-login");
			loginSpan.textContent = user.login;
			listItem.append(loginSpan);
			listItem.insertAdjacentText("beforeend", " - ");

			const passwordSpan = document.createElement("span");
			passwordSpan.classList.add("user-list-password");
			passwordSpan.textContent = user.password;
			listItem.append(passwordSpan);
			listItem.insertAdjacentText("beforeend", " ");

			const deleteBtn = document.createElement("button");
			deleteBtn.classList.add("btn", "btn-danger");
			deleteBtn.dataset.action = "delete-user";
			deleteBtn.dataset.id = user.id;
			deleteBtn.innerHTML = "&times;";
			listItem.append(deleteBtn);

			return listItem;
		});
	}

	usersList.append(...getListItems(users));
	adminsList.append(...getListItems(admins));
}

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
				swal.fire({
					title: "Error",
					text: "Task title cannot be empty!",
					icon: "error",
				});
			} else {
				Task.update(taskId, { title, description });
				handlePopupAction(popup, "close");
				renderTasks(appState.tasks);
			}
			break;
		case "delete":
			swal
				.fire({
					titleText: `Are you sure you want to delete "${title}"?`,
					showDenyButton: true,
					confirmButtonText: "Delete",
					denyButtonText: "No, keep it",
					reverseButtons: true,
					customClass: {
						confirmButton: "btn btn-danger",
						denyButton: "btn btn-primary",
					},
				})
				.then((result) => {
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

	const accessibleTasks = tasks.filter((task) =>
		appState.currentUser.canReadTask(task),
	);

	const users = new Map();

	for (const task of accessibleTasks) {
		const listItem = document.createElement("li");
		listItem.classList.add("task");
		listItem.textContent = task.title;
		listItem.dataset.description = task.description;
		listItem.dataset.id = task.id;
		listItem.setAttribute("draggable", "true");
		if (appState.currentUser.isAdmin()) {
			let owner;
			if (users.has(task.belongsTo)) owner = users.get(task.belongsTo);
			else {
				owner = User.get(task.belongsTo);
				users.set(task.belongsTo, owner);
			}
			const ownerLoginSpan = document.createElement("span");
			ownerLoginSpan.classList.add("task-owner-login");
			ownerLoginSpan.textContent = owner.login + ":";
			listItem.insertAdjacentElement("afterbegin", ownerLoginSpan);
		}
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
