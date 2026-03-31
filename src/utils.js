import { Task } from "./models/Task";

export const getFromStorage = function (key) {
	return JSON.parse(localStorage.getItem(key) || "[]");
};

export const addToStorage = function (obj, key) {
	const storageData = getFromStorage(key);
	storageData.push(obj);
	localStorage.setItem(key, JSON.stringify(storageData));
};

export const replaceStorage = function (key, newData) {
	localStorage.setItem(key, JSON.stringify(newData));
};

export const generateFirstUsers = function (User) {
	if (!getFromStorage(Task.storageKey).length) localStorage.clear();
	const adminUser = new User("admin", "admin", "admin");
	const mundaneUser = new User("test", "qwerty123", "user");
	User.save(adminUser);
	User.save(mundaneUser);
};
