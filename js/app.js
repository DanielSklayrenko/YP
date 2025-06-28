document.addEventListener('DOMContentLoaded', function() {
    // Инициализация приложения
    const app = {
        tasks: JSON.parse(localStorage.getItem('tasks')) || [],
        timer: {
            minutes: 25,
            seconds: 0,
            interval: null,
            isRunning: false,
            type: 'pomodoro'
        },
        stats: JSON.parse(localStorage.getItem('stats')) || {
            completedTasks: 0,
            timeSpent: 0,
            pomodoros: 0
        },
        
        // Инициализация
        init: function() {
            this.initUser();
            this.initFlatpickr();
            this.renderTasks();
            this.initEventListeners();
            this.initTimer();
            this.updateStats();
        },
        
        // Инициализация пользователя
        initUser: function() {
            const username = localStorage.getItem('username') || 'Пользователь';
            document.getElementById('userGreeting').innerHTML = `
                <span class="me-3">Привет, ${username}</span>
                <button class="btn btn-outline-secondary btn-sm" id="showStats">Статистика</button>
            `;
        },
        
        // Инициализация datetime picker
        initFlatpickr: function() {
            flatpickr("#due_date", {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                time_24hr: true,
                locale: "ru"
            });
        },
        
        // Инициализация таймера
        initTimer: function() {
            this.updateTimerDisplay();
        },
        
        // Обработчики событий
        initEventListeners: function() {
            // Форма добавления задачи
            document.getElementById('taskForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.addTask();
            });
            
            // Фильтры задач
            document.getElementById('filterAll').addEventListener('click', () => this.filterTasks('all'));
            document.getElementById('filterPending').addEventListener('click', () => this.filterTasks('pending'));
            document.getElementById('filterCompleted').addEventListener('click', () => this.filterTasks('completed'));
            
            // Кнопки таймера
            document.getElementById('startTimer').addEventListener('click', () => this.startTimer());
            document.getElementById('pauseTimer').addEventListener('click', () => this.pauseTimer());
            document.getElementById('resetTimer').addEventListener('click', () => this.resetTimer());
            document.getElementById('timerType').addEventListener('change', (e) => this.changeTimerType(e.target.value));
            
            // Статистика
            document.getElementById('showStats').addEventListener('click', () => this.showStats());
        },
        
        // Добавление задачи
        addTask: function() {
            const form = document.getElementById('taskForm');
            const title = form.title.value.trim();
            const description = form.description.value.trim();
            const priority = form.priority.value;
            const dueDate = form.due_date.value;
            
            if (!title) return;
            
            const newTask = {
                id: Date.now(),
                title,
                description,
                priority,
                dueDate,
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            
            this.tasks.push(newTask);
            this.saveTasks();
            this.renderTasks();
            form.reset();
        },
        
        // Сохранение задач в localStorage
        saveTasks: function() {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        },
        
        // Отображение задач
        renderTasks: function(filter = 'all') {
            const taskList = document.getElementById('taskList');
            taskList.innerHTML = '';
            
            let filteredTasks = this.tasks;
            
            if (filter === 'pending') {
                filteredTasks = this.tasks.filter(task => task.status === 'pending');
            } else if (filter === 'completed') {
                filteredTasks = this.tasks.filter(task => task.status === 'completed');
            }
            
            if (filteredTasks.length === 0) {
                taskList.innerHTML = '<div class="text-center py-4 text-muted">Нет задач</div>';
                return;
            }
            
            filteredTasks.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = `task-item ${task.status} ${task.priority}`;
                taskElement.dataset.id = task.id;
                
                const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleString('ru-RU') : 'Нет срока';
                
                taskElement.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <h5 class="task-title">${task.title}</h5>
                        <div class="task-actions">
                            ${task.status !== 'completed' ? 
                                `<button class="btn btn-sm btn-outline-success complete-btn">✓</button>` : ''}
                            <button class="btn btn-sm btn-outline-danger delete-btn">✕</button>
                        </div>
                    </div>
                    ${task.description ? `<p>${task.description}</p>` : ''}
                    <div class="task-meta d-flex justify-content-between">
                        <span>Приоритет: ${this.getPriorityName(task.priority)}</span>
                        <span>Срок: ${dueDate}</span>
                    </div>
                `;
                
                taskList.appendChild(taskElement);
                
                // Добавляем обработчики для кнопок задачи
                if (task.status !== 'completed') {
                    taskElement.querySelector('.complete-btn').addEventListener('click', () => this.completeTask(task.id));
                }
                taskElement.querySelector('.delete-btn').addEventListener('click', () => this.deleteTask(task.id));
            });
        },
        
        // Фильтрация задач
        filterTasks: function(filter) {
            // Обновляем активную кнопку фильтра
            document.querySelectorAll('.btn-group button').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`).classList.add('active');
            
            this.renderTasks(filter);
        },
        
        // Завершение задачи
        completeTask: function(taskId) {
            const taskIndex = this.tasks.findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
                this.tasks[taskIndex].status = 'completed';
                this.tasks[taskIndex].completedAt = new Date().toISOString();
                this.saveTasks();
                this.renderTasks();
                this.updateStats();
            }
        },
        
        // Удаление задачи
        deleteTask: function(taskId) {
            if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
                this.tasks = this.tasks.filter(task => task.id !== taskId);
                this.saveTasks();
                this.renderTasks();
            }
        },
        
        // Получение названия приоритета
        getPriorityName: function(priority) {
            const names = {
                'low': 'Низкий',
                'medium': 'Средний',
                'high': 'Высокий'
            };
            return names[priority] || priority;
        },
        
        // Таймер Pomodoro
        startTimer: function() {
            if (this.timer.isRunning) return;
            
            this.timer.isRunning = true;
            this.timer.interval = setInterval(() => {
                this.timer.seconds--;
                
                if (this.timer.seconds < 0) {
                    this.timer.minutes--;
                    this.timer.seconds = 59;
                }
                
                if (this.timer.minutes < 0) {
                    this.timerFinished();
                    return;
                }
                
                this.updateTimerDisplay();
            }, 1000);
        },
        
        pauseTimer: function() {
            if (!this.timer.isRunning) return;
            
            clearInterval(this.timer.interval);
            this.timer.isRunning = false;
        },
        
        resetTimer: function() {
            this.pauseTimer();
            this.changeTimerType(this.timer.type);
        },
        
        timerFinished: function() {
            this.pauseTimer();
            alert('Таймер завершен!');
            
            // Обновляем статистику
            if (this.timer.type === 'pomodoro') {
                this.stats.pomodoros++;
                this.stats.timeSpent += 25;
            } else if (this.timer.type === 'shortBreak') {
                this.stats.timeSpent += 5;
            } else if (this.timer.type === 'longBreak') {
                this.stats.timeSpent += 15;
            }
            
            this.saveStats();
            this.updateStats();
            
            // Автоматически переключаем на следующий таймер
            if (this.timer.type === 'pomodoro') {
                if (this.stats.pomodoros % 4 === 0) {
                    this.changeTimerType('longBreak');
                } else {
                    this.changeTimerType('shortBreak');
                }
            } else {
                this.changeTimerType('pomodoro');
            }
            
            this.startTimer();
        },
        
        changeTimerType: function(type) {
            this.timer.type = type;
            
            switch (type) {
                case 'pomodoro':
                    this.timer.minutes = 25;
                    break;
                case 'shortBreak':
                    this.timer.minutes = 5;
                    break;
                case 'longBreak':
                    this.timer.minutes = 15;
                    break;
            }
            
            this.timer.seconds = 0;
            this.updateTimerDisplay();
        },
        
        updateTimerDisplay: function() {
            const display = document.getElementById('timerDisplay');
            const minutes = this.timer.minutes.toString().padStart(2, '0');
            const seconds = this.timer.seconds.toString().padStart(2, '0');
            display.textContent = `${minutes}:${seconds}`;
        },
        
        // Статистика
        showStats: function() {
            this.updateStats();
            
            // Создаем график
            const ctx = document.getElementById('productivityChart').getContext('2d');
            
            // Если график уже существует, уничтожаем его
            if (this.productivityChart) {
                this.productivityChart.destroy();
            }
            
            this.productivityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Выполнено задач', 'Невыполненных задач', 'Потрачено времени (мин)'],
                    datasets: [{
                        label: 'Продуктивность',
                        data: [this.stats.completedTasks, this.stats.pomodoros, this.stats.timeSpent],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(54, 162, 235, 0.6)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            // Показываем модальное окно
            const modal = new bootstrap.Modal(document.getElementById('statsModal'));
            modal.show();
        },
        
        updateStats: function() {
            this.stats.completedTasks = this.tasks.filter(task => task.status === 'completed').length;
            this.saveStats();
            
            document.getElementById('completedTasksCount').textContent = this.stats.completedTasks;
            document.getElementById('timeSpent').textContent = this.stats.timeSpent;
        },
        
        saveStats: function() {
            localStorage.setItem('stats', JSON.stringify(this.stats));
        }
    };
    
    // Запускаем приложение
    app.init();
});