import { renderTasks } from "../app";
import { Task } from "../models/Task";

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
			renderTasks();
		}
	}
});
