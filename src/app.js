import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.css";
import taskFieldTemplate from "./templates/taskField.html";
import noAccessTemplate from "./templates/noAccess.html";
import { User } from "./models/User";
import { generateTestUser } from "./utils";
import { State } from "./state";
import { authUser } from "./services/auth";
import { toggleTasksCounter, updateTasksCounter } from "./tasksCounter";
import { Task } from "./models/Task";
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
// Map<destination, source>
const taskCategoryRelationships = new Map([
	["ready", "backlog"],
	["in-progress", "ready"],
	["finished", "in-progress"],
]);

export const appState = new State();
window.appState = appState;

const loginForm = document.querySelector("#app-login-form");

if (!localStorage.getItem("users")) generateTestUser(User);

loginForm.addEventListener("submit", function (e) {
	e.preventDefault();
	const formData = new FormData(loginForm);
	const login = formData.get("login");
	const password = formData.get("password");
	const isAuthenticated = authUser(login, password);

	let fieldHTMLContent = isAuthenticated ? taskFieldTemplate : noAccessTemplate;

	contentDiv.innerHTML = fieldHTMLContent;

	if (isAuthenticated) {
		toggleTasksCounter();
		appState.tasks = Task.getTasks();
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
		renderTasks(appState.tasks);
		updateTasksCounter();
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
});

document.body.addEventListener("click", (event) => {
	if (event.target === backlogAddButton) {
		if (addInputWrapper.classList.contains("d-none")) {
			addInputWrapper.classList.remove("d-none");
		}
		addInput.focus();
		backlogAddButton.classList.add("d-none");
		backlogSubmitButton.classList.remove("d-none");
	} else if (event.target.classList.contains("task-add-button")) {
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

toggleTasksCounter();

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
