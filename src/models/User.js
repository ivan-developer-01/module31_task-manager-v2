import { BaseModel } from "./BaseModel";
import { getFromStorage, addToStorage, replaceStorage } from "../utils";

export class User extends BaseModel {
	constructor(login, password) {
		super();
		this.login = login;
		this.password = password;
		this.storageKey = User.storageKey;
		if (this.hasAccess) {
			this.id = getFromStorage(this.storageKey).find(
				(user) => user.login === login && user.password === password,
			).id;
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

	canReadTask(task) {
		return task.belongsTo === this.id;
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
		const users = getFromStorage(this.storageKey);
		for (const user of users) {
			if (user.id === id) return user;
		}

		return null;
	}
}
