/**
 * Priority Module - 優先順位付け機能 (Eisenhower Matrix, Eat The Frog)
 */

const Priority = {
    init() {
        // 初期化処理があればここに追加
    },

    // Eisenhower Matrixの描画
    renderEisenhower() {
        const container = document.getElementById('priorityView'); // 既存のビューコンテナを再利用するか、新規作成するか
        if (!container) return; // UI側でコンテナを用意する必要あり

        container.innerHTML = `
            <div class="priority-header">
                <h2>Eisenhower Matrix</h2>
                <p>緊急度と重要度でタスクを分類します</p>
            </div>
            <div class="matrix-grid">
                <div class="matrix-quadrant q1" data-q="1">
                    <div class="quadrant-header">
                        <span class="q-label">重要 & 緊急</span>
                        <span class="q-action">すぐにやる (Do)</span>
                    </div>
                    <div class="quadrant-content" id="matrix-q1"></div>
                </div>
                <div class="matrix-quadrant q2" data-q="2">
                    <div class="quadrant-header">
                        <span class="q-label">重要 & 非緊急</span>
                        <span class="q-action">計画する (Decide)</span>
                    </div>
                    <div class="quadrant-content" id="matrix-q2"></div>
                </div>
                <div class="matrix-quadrant q3" data-q="3">
                    <div class="quadrant-header">
                        <span class="q-label">非重要 & 緊急</span>
                        <span class="q-action">任せる (Delegate)</span>
                    </div>
                    <div class="quadrant-content" id="matrix-q3"></div>
                </div>
                <div class="matrix-quadrant q4" data-q="4">
                    <div class="quadrant-header">
                        <span class="q-label">非重要 & 非緊急</span>
                        <span class="q-action">やめる (Delete)</span>
                    </div>
                    <div class="quadrant-content" id="matrix-q4"></div>
                </div>
            </div>
        `;

        this.renderMatrixTasks();
        this.initMatrixDnD();
    },

    renderMatrixTasks() {
        const tasks = Storage.getTasks();
        // マトリックスデータ（タスクIDごとの象限情報）を取得
        // まだデータ構造がないので、LocalStorageに 'priority-matrix' として保存すると仮定
        const matrixData = JSON.parse(localStorage.getItem('priority-matrix')) || {};

        // タスクを割り振り
        const q1List = document.getElementById('matrix-q1');
        const q2List = document.getElementById('matrix-q2');
        const q3List = document.getElementById('matrix-q3');
        const q4List = document.getElementById('matrix-q4');

        if (!q1List) return;

        // 配列初期化
        const quadrants = { 1: [], 2: [], 3: [], 4: [] };

        tasks.forEach(task => {
            if (task.completed) return; // 完了済みは除外
            const q = matrixData[task.id] || 2; // デフォルトはQ2（計画）
            quadrants[q].push(task);
        });

        // 描画
        [1, 2, 3, 4].forEach(q => {
            const listEl = document.getElementById(`matrix-q${q}`);
            listEl.innerHTML = '';
            quadrants[q].forEach(task => {
                const el = document.createElement('div');
                el.className = 'matrix-task-card';
                el.draggable = true;
                el.dataset.id = task.id;
                el.textContent = task.name;

                el.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'matrix-task',
                        id: task.id
                    }));
                    el.classList.add('dragging');
                });

                el.addEventListener('dragend', () => {
                    el.classList.remove('dragging');
                });

                listEl.appendChild(el);
            });
        });
    },

    initMatrixDnD() {
        document.querySelectorAll('.matrix-quadrant').forEach(quadrant => {
            quadrant.addEventListener('dragover', (e) => {
                e.preventDefault();
                quadrant.classList.add('drag-over');
            });

            quadrant.addEventListener('dragleave', () => {
                quadrant.classList.remove('drag-over');
            });

            quadrant.addEventListener('drop', (e) => {
                e.preventDefault();
                quadrant.classList.remove('drag-over');

                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (data.type === 'matrix-task') {
                        const targetQ = parseInt(quadrant.dataset.q);
                        this.updateTaskQuadrant(data.id, targetQ);
                    }
                } catch (err) {
                    console.error('Matrix Drop Error', err);
                }
            });
        });
    },

    updateTaskQuadrant(taskId, quadrant) {
        const matrixData = JSON.parse(localStorage.getItem('priority-matrix')) || {};
        matrixData[taskId] = quadrant;
        localStorage.setItem('priority-matrix', JSON.stringify(matrixData));
        this.renderMatrixTasks();
    },

    // Eat The Frog 描画
    renderEatTheFrog() {
        const container = document.getElementById('priorityView'); // 同様に切り替え
        if (!container) return;

        const today = new Date().toDateString();
        const frogs = JSON.parse(localStorage.getItem('eat-the-frog')) || {};
        const todayFrogId = frogs[today];

        let frogTask = null;
        const tasks = Storage.getTasks();
        if (todayFrogId) {
            frogTask = tasks.find(t => t.id === todayFrogId);
        }

        container.innerHTML = `
            <div class="priority-header">
                <h2>Eat The Frog First</h2>
                <p>今日一番、気が重いけれど重要なタスクを1つだけ選びましょう。</p>
            </div>
            <div class="frog-container">
                <div class="frog-stage ${frogTask ? 'has-frog' : ''}" id="frogStage">
                    <div class="frog-placeholder">
                        <div class="frog-icon">🐸</div>
                        <p>ここにタスクをドロップ</p>
                    </div>
                    ${frogTask ? `
                        <div class="frog-task-card">
                            <h3>${frogTask.name}</h3>
                            <button id="removeFrogBtn">解除</button>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="frog-candidates">
                <h3>候補タスク</h3>
                <div class="checklist-container" id="frogCandidates"></div>
            </div>
        `;

        this.renderFrogCandidates(tasks, todayFrogId);
        this.initFrogDnD(today);

        // 解除ボタン
        const removeBtn = document.getElementById('removeFrogBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                delete frogs[today];
                localStorage.setItem('eat-the-frog', JSON.stringify(frogs));
                this.renderEatTheFrog();
            });
        }
    },

    renderFrogCandidates(tasks, currentFrogId) {
        const list = document.getElementById('frogCandidates');
        tasks.forEach(task => {
            if (task.completed || task.id === currentFrogId) return;

            const el = document.createElement('div');
            el.className = 'candidate-card';
            el.draggable = true;
            el.textContent = task.name;

            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'frog-candidate',
                    id: task.id
                }));
            });

            list.appendChild(el);
        });
    },

    initFrogDnD(dateKey) {
        const stage = document.getElementById('frogStage');

        stage.addEventListener('dragover', (e) => {
            e.preventDefault();
            stage.classList.add('drag-over');
        });

        stage.addEventListener('dragleave', () => {
            stage.classList.remove('drag-over');
        });

        stage.addEventListener('drop', (e) => {
            e.preventDefault();
            stage.classList.remove('drag-over');

            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'frog-candidate') {
                    const frogs = JSON.parse(localStorage.getItem('eat-the-frog')) || {};
                    frogs[dateKey] = data.id;
                    localStorage.setItem('eat-the-frog', JSON.stringify(frogs));
                    this.renderEatTheFrog();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Priority;
}
