/**
 * Storage Module - ローカルストレージでのデータ管理
 */

const Storage = {
    KEYS: {
        PROJECTS: 'pm_projects',
        TASKS: 'pm_tasks',
        CATEGORIES: 'pm_categories',
        SETTINGS: 'pm_settings'
    },

    // 初期化
    init() {
        if (!this.get(this.KEYS.PROJECTS)) {
            this.set(this.KEYS.PROJECTS, []);
        }
        if (!this.get(this.KEYS.TASKS)) {
            this.set(this.KEYS.TASKS, []);
        }
        if (!this.get(this.KEYS.CATEGORIES)) {
            this.set(this.KEYS.CATEGORIES, []);
        }
        if (!this.get(this.KEYS.SETTINGS)) {
            this.set(this.KEYS.SETTINGS, {
                theme: 'dark',
                defaultView: 'gantt',
                ganttScale: 'week'
            });
        }
    },

    // 基本操作
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    // ID生成
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // プロジェクト操作
    getProjects() {
        return this.get(this.KEYS.PROJECTS) || [];
    },

    getProject(id) {
        const projects = this.getProjects();
        return projects.find(p => p.id === id);
    },

    saveProject(project) {
        const projects = this.getProjects();
        const now = new Date().toISOString();
        
        if (project.id) {
            const index = projects.findIndex(p => p.id === project.id);
            if (index !== -1) {
                projects[index] = { ...projects[index], ...project, updatedAt: now };
            }
        } else {
            project.id = this.generateId('proj');
            project.createdAt = now;
            project.updatedAt = now;
            projects.push(project);
        }
        
        this.set(this.KEYS.PROJECTS, projects);
        return project;
    },

    deleteProject(id) {
        let projects = this.getProjects();
        projects = projects.filter(p => p.id !== id);
        this.set(this.KEYS.PROJECTS, projects);
        
        // 関連タスクも削除
        let tasks = this.getTasks();
        tasks = tasks.filter(t => t.projectId !== id);
        this.set(this.KEYS.TASKS, tasks);
    },

    // タスク操作
    getTasks(projectId = null) {
        const tasks = this.get(this.KEYS.TASKS) || [];
        if (projectId) {
            return tasks.filter(t => t.projectId === projectId);
        }
        return tasks;
    },

    getTask(id) {
        const tasks = this.getTasks();
        return tasks.find(t => t.id === id);
    },

    saveTask(task) {
        const tasks = this.getTasks();
        const now = new Date().toISOString();
        
        if (task.id) {
            const index = tasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
                tasks[index] = { ...tasks[index], ...task, updatedAt: now };
            }
        } else {
            task.id = this.generateId('task');
            task.createdAt = now;
            task.updatedAt = now;
            tasks.push(task);
        }
        
        this.set(this.KEYS.TASKS, tasks);
        return task;
    },

    deleteTask(id) {
        let tasks = this.getTasks();
        tasks = tasks.filter(t => t.id !== id);
        this.set(this.KEYS.TASKS, tasks);
    },

    // カテゴリ操作
    getCategories() {
        return this.get(this.KEYS.CATEGORIES) || [];
    },

    saveCategory(category) {
        const categories = this.getCategories();
        
        if (category.id) {
            const index = categories.findIndex(c => c.id === category.id);
            if (index !== -1) {
                categories[index] = { ...categories[index], ...category };
            }
        } else {
            category.id = this.generateId('cat');
            categories.push(category);
        }
        
        this.set(this.KEYS.CATEGORIES, categories);
        return category;
    },

    deleteCategory(id) {
        let categories = this.getCategories();
        categories = categories.filter(c => c.id !== id);
        this.set(this.KEYS.CATEGORIES, categories);
    },

    // 設定
    getSettings() {
        return this.get(this.KEYS.SETTINGS) || {};
    },

    saveSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        this.set(this.KEYS.SETTINGS, settings);
    },

    // エクスポート
    exportData() {
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            projects: this.getProjects(),
            tasks: this.getTasks(),
            categories: this.getCategories(),
            settings: this.getSettings()
        };
    },

    // インポート
    importData(data) {
        if (!data.version) {
            throw new Error('無効なデータ形式です');
        }
        
        if (data.projects) this.set(this.KEYS.PROJECTS, data.projects);
        if (data.tasks) this.set(this.KEYS.TASKS, data.tasks);
        if (data.categories) this.set(this.KEYS.CATEGORIES, data.categories);
        if (data.settings) this.set(this.KEYS.SETTINGS, data.settings);
        
        return true;
    },

    // クリア
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        this.init();
    }
};

// 初期化
Storage.init();
