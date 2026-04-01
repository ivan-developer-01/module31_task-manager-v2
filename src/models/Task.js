import { BaseModel } from "./BaseModel";
import { getFromStorage, addToStorage, replaceStorage } from "../utils";
import { appState } from "../app";

export class Task extends BaseModel {
	constructor(title, description, category, belongsTo) {
		super();
		this.title = title;
		this.description = description;
		this.category = category;
		this.belongsTo = belongsTo;
		this.storageKey = Task.storageKey;
	}

	static get storageKey() {
		return "tasks";
	}

	static save(task) {
		try {
			addToStorage(task, task.storageKey);
			return true;
		} catch (error) {
			throw new Error("Failed to save task", { cause: error });
		}
	}

	static get(taskId) {
		return Task.getTasks().find((task) => task.id === taskId) ?? null;
	}

	static getTasks() {
		return getFromStorage(this.storageKey);
	}

	static update(taskId, changedProperties, { splice = false } = {}) {
		const taskIndex = appState.tasks.findIndex((task) => task.id === taskId);
		if (splice) {
			const [savedTask] = appState.tasks.splice(taskIndex, 1);
			appState.tasks.push({ ...savedTask, ...changedProperties });
			// what a genius
		} else {
			appState.tasks[taskIndex] = {
				...appState.tasks[taskIndex],
				...changedProperties,
			};
		}
		replaceStorage(this.storageKey, appState.tasks);
	}

	static delete(taskId) {
		const index = appState.tasks.findIndex((task) => task.id === taskId);
		if (!index) return;
		appState.tasks.splice(index, 1);
		replaceStorage(this.storageKey, appState.tasks);
	}

	static deleteByUserId(userId) {
		appState.tasks = appState.tasks.filter((task) => task.belongsTo !== userId);
		replaceStorage(this.storageKey, appState.tasks);
	}
}
