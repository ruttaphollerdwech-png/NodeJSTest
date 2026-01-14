document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');

    // Fetch and render tasks
    async function fetchTasks() {
        const res = await fetch('/api/tasks');
        const tasks = await res.json();
        renderTasks(tasks);
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <div class="task-content">
                    <div class="checkbox"></div>
                    <span class="task-text">${task.text}</span>
                </div>
                <button class="delete-btn" title="Delete task">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            `;

            // Toggle completion
            li.querySelector('.task-content').addEventListener('click', async () => {
                await fetch(`/api/tasks/${task.id}`, { method: 'PUT' });
                fetchTasks();
            });

            // Delete task
            li.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
                fetchTasks();
            });

            taskList.appendChild(li);
        });
    }

    // Add task
    async function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;

        await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        taskInput.value = '';
        fetchTasks();
    }

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Initial load
    fetchTasks();
});
