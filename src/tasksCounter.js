import { appState } from "./app";

const tasksCounterDiv = document.querySelector(".tasks-counter"),
	activeTasksCounter = tasksCounterDiv.querySelector("#active-tasks-count"),
	finishedTasksCounter = tasksCounterDiv.querySelector("#finished-tasks-count");

/** Shows or hides the tasks counter depending on whether the user is logged in. */
export function toggleTasksCounter() {
	if (appState.currentUser) {
		tasksCounterDiv.classList.remove("visibility-hidden");
	} else {
		tasksCounterDiv.classList.add("visibility-hidden");
	}
}

export function updateTasksCounter() {
	let activeTasks, finishedTasks;
	if (appState.tasks) {
		activeTasks = appState.tasks.filter(
			(task) =>
				appState.currentUser.canReadTask(task) && task.category === "backlog",
		).length;
		finishedTasks = appState.tasks.filter(
			(task) =>
				appState.currentUser.canReadTask(task) && task.category === "finished",
		).length;
		activeTasksCounter.textContent = activeTasks;
		finishedTasksCounter.textContent = finishedTasks;
	}
}
