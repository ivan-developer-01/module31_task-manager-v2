import { BaseModel } from "./BaseModel";
import { getFromStorage, addToStorage, replaceStorage } from "../utils";
import { Task } from "./Task";

export class User extends BaseModel {
	constructor(login, password, role) {
		super();
		this.login = login;
		this.password = password;
		this.storageKey = User.storageKey;
		this.role = role;
		if (this.hasAccess) {
			const userEntry = getFromStorage(this.storageKey).find(
				(user) => user.login === login && user.password === password,
			);
			this.id = userEntry.id;
			this.role = userEntry.role;
		}
	}

	static get storageKey() {
		return "users";
	}

	get hasAccess() {
		let users = getFromStorage(this.storageKey);
		if (users.length == 0) return false;
		for (let user of users) {
			if (user.login == this.login && user.password == this.password)
				return true;
		}
		return false;
	}

	isAdmin() {
		return this.role === "admin";
	}

	canReadTask(task) {
		return this.isAdmin() || task.belongsTo === this.id;
	}

	static save(user) {
		try {
			addToStorage(user, user.storageKey);
			return true;
		} catch (error) {
			throw new Error(error);
		}
	}

	static update(userId, changedProperties) {
		const users = getFromStorage(User.storageKey);
		const userIndex = users.findIndex((user) => user.id === userId);
		users[userIndex] = {
			...users[userIndex],
			...changedProperties,
		};
		replaceStorage(User.storageKey, users);
	}

	static get(id) {
		return this.getUsers().find((user) => user.id === id) ?? null;
	}

	static getUsers(id) {
		return getFromStorage(this.storageKey);
	}

	static delete(userId) {
		const users = getFromStorage(this.storageKey);
		const index = users.findIndex((user) => user.id === userId);
		if (!index) return;
		Task.deleteByUserId(userId);
		users.splice(index, 1);
		replaceStorage(this.storageKey, users);
	}
}
