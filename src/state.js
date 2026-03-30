export class State {
	constructor() {
		this.currentUser = null;
		this.tasks = null;
	}
	set currentUser(user) {
		this._currentUser = user;
	}
	get currentUser() {
		return this._currentUser;
	}
	set tasks(tasks) {
		this._tasks = tasks;
	}
	get tasks() {
		return this._tasks;
	}
}
