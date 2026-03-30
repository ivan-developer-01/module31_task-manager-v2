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
			throw new Error(error);
		}
	}

	static getTasks() {
		return getFromStorage(Task.storageKey);
	}

	static update(taskId, changedProperties) {
		const taskIndex = appState.tasks.findIndex((task) => task.id === taskId);
		appState.tasks[taskIndex] = {
			...appState.tasks[taskIndex],
			...changedProperties,
		};
		replaceStorage(Task.storageKey, appState.tasks);
	}
}
