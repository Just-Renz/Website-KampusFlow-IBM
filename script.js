/**
 * script.js — KampusFlow Task Manager
 *
 * Fitur:
 *  - CRUD: Create, Read, Update, Delete task
 *  - Toggle status: Active <-> Completed
 *  - Filter: All | Active | Completed
 *  - Persistensi data menggunakan localStorage
 *  - Toast notification untuk feedback aksi
 *
 * Tanpa dependency eksternal — Vanilla JavaScript murni.
 */

"use strict";

/* ═══════════════════════════════════════════════════════════════
   1. STATE & CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

/** Kunci penyimpanan di localStorage */
const STORAGE_KEY = "kampusflow_tasks";

/**
 * @typedef {Object} Task
 * @property {string}  id        - UUID unik setiap task
 * @property {string}  text      - Deskripsi task
 * @property {boolean} completed - Status task
 * @property {number}  createdAt - Unix timestamp pembuatan
 */

/** @type {Task[]} — array master semua task */
let tasks = [];

/** Filter aktif saat ini: 'all' | 'active' | 'completed' */
let activeFilter = "all";

/** ID task yang sedang diedit (null jika modal tertutup) */
let editingId = null;

/* ═══════════════════════════════════════════════════════════════
   2. DOM REFERENCES
   ═══════════════════════════════════════════════════════════════ */

const taskForm      = document.getElementById("task-form");
const taskInput     = document.getElementById("task-input");
const inputError    = document.getElementById("input-error");
const taskList      = document.getElementById("task-list");
const emptyState    = document.getElementById("empty-state");
const emptyMessage  = document.getElementById("empty-message");
const taskCount     = document.getElementById("task-count");
const filterTabs    = document.getElementById("filter-tabs");
const clearCompBtn  = document.getElementById("clear-completed");

const editModal     = document.getElementById("edit-modal");
const editInput     = document.getElementById("edit-input");
const editError     = document.getElementById("edit-error");
const modalCancel   = document.getElementById("modal-cancel");
const modalSave     = document.getElementById("modal-save");

const toast         = document.getElementById("toast");

/* ═══════════════════════════════════════════════════════════════
   3. PERSISTENCE — localStorage
   ═══════════════════════════════════════════════════════════════ */

/**
 * Memuat tasks dari localStorage ke variabel `tasks`.
 * Jika data tidak ada atau rusak, mulai dengan array kosong.
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch {
    tasks = [];
  }
}

/**
 * Menyimpan array `tasks` ke localStorage.
 */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/* ═══════════════════════════════════════════════════════════════
   4. UTILITY
   ═══════════════════════════════════════════════════════════════ */

/**
 * Menghasilkan ID unik sederhana berbasis timestamp + random.
 * @returns {string}
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Menampilkan pesan toast sementara (2 detik).
 * @param {string} message - Pesan yang ditampilkan
 */
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("toast-visible");
  // Hapus setelah 2 detik
  setTimeout(() => {
    toast.classList.remove("toast-visible");
  }, 2000);
}

/**
 * Menampilkan atau menyembunyikan pesan error inline.
 * @param {HTMLElement} el      - Elemen error
 * @param {string|null} message - Pesan error; null untuk menyembunyikan
 */
function setError(el, message) {
  if (message) {
    el.textContent = message;
    el.classList.remove("hidden");
  } else {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

/**
 * Mengembalikan tasks yang sesuai dengan filter aktif.
 * @returns {Task[]}
 */
function getFilteredTasks() {
  switch (activeFilter) {
    case "active":    return tasks.filter(t => !t.completed);
    case "completed": return tasks.filter(t =>  t.completed);
    default:          return [...tasks];
  }
}

/* ═══════════════════════════════════════════════════════════════
   5. RENDER
   ═══════════════════════════════════════════════════════════════ */

/**
 * Me-render ulang seluruh daftar task sesuai filter aktif.
 * Dipanggil setiap kali ada perubahan data atau filter.
 */
function renderTasks() {
  const filtered = getFilteredTasks();

  // Kosongkan list sebelum render ulang
  taskList.innerHTML = "";

  if (filtered.length === 0) {
    showEmptyState();
  } else {
    hideEmptyState();
    filtered.forEach(task => {
      taskList.appendChild(createTaskElement(task));
    });
  }

  updateHeader();
}

/**
 * Membuat elemen <li> untuk sebuah task.
 * @param   {Task}        task
 * @returns {HTMLElement}
 */
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = `task-item${task.completed ? " completed" : ""}`;
  li.dataset.id = task.id;

  li.innerHTML = `
    <input
      type="checkbox"
      class="task-checkbox"
      ${task.completed ? "checked" : ""}
      aria-label="Mark '${escapeHtml(task.text)}' as ${task.completed ? "active" : "completed"}"
    />
    <span class="task-text">${escapeHtml(task.text)}</span>
    <div class="task-actions" aria-label="Task actions">
      <button class="action-btn edit-btn" title="Edit task" aria-label="Edit task">
        <!-- Pencil icon -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="action-btn delete-btn" title="Delete task" aria-label="Delete task">
        <!-- Trash icon -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  `;

  // Event: toggle completed
  li.querySelector(".task-checkbox").addEventListener("change", () => toggleTask(task.id));

  // Event: edit
  li.querySelector(".edit-btn").addEventListener("click", () => openEditModal(task.id));

  // Event: delete
  li.querySelector(".delete-btn").addEventListener("click", () => deleteTask(task.id));

  return li;
}

/**
 * Menampilkan empty state sesuai pesan filter yang aktif.
 */
function showEmptyState() {
  taskList.classList.add("hidden");
  emptyState.classList.remove("hidden");
  emptyState.classList.add("flex");

  const messages = {
    all:       "No tasks yet. Add one above!",
    active:    "No active tasks. Great job! 🎉",
    completed: "No completed tasks yet. Keep going!",
  };
  emptyMessage.textContent = messages[activeFilter];
}

function hideEmptyState() {
  taskList.classList.remove("hidden");
  emptyState.classList.add("hidden");
  emptyState.classList.remove("flex");
}

/**
 * Memperbarui badge jumlah task dan tombol "Clear completed".
 */
function updateHeader() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active    = total - completed;

  // Badge di header
  taskCount.textContent = `${active} active / ${total} total`;

  // Tombol clear completed
  if (completed > 0) {
    clearCompBtn.classList.remove("hidden");
  } else {
    clearCompBtn.classList.add("hidden");
  }

  // Update aria-selected pada filter tabs
  document.querySelectorAll(".filter-tab").forEach(btn => {
    const selected = btn.dataset.filter === activeFilter;
    btn.setAttribute("aria-selected", String(selected));
  });
}

/**
 * Escape karakter HTML untuk mencegah XSS.
 * @param   {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ═══════════════════════════════════════════════════════════════
   6. CRUD OPERATIONS
   ═══════════════════════════════════════════════════════════════ */

/**
 * CREATE — Menambahkan task baru ke array dan menyimpannya.
 * @param {string} text - Deskripsi task
 */
function addTask(text) {
  /** @type {Task} */
  const newTask = {
    id:        generateId(),
    text:      text.trim(),
    completed: false,
    createdAt: Date.now(),
  };

  // Tambahkan ke awal array agar task terbaru tampil di atas
  tasks.unshift(newTask);
  saveTasks();
  renderTasks();
  showToast("Task added successfully!");
}

/**
 * TOGGLE — Mengubah status completed sebuah task.
 * @param {string} id - ID task
 */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderTasks();

  const msg = task.completed ? "Task marked as completed." : "Task marked as active.";
  showToast(msg);
}

/**
 * UPDATE — Menyimpan teks baru hasil edit modal.
 */
function saveEditTask() {
  const newText = editInput.value.trim();

  if (!newText) {
    setError(editError, "Task description cannot be empty.");
    return;
  }
  if (newText.length > 120) {
    setError(editError, "Maximum 120 characters.");
    return;
  }

  const task = tasks.find(t => t.id === editingId);
  if (task) {
    task.text = newText;
    saveTasks();
    renderTasks();
    showToast("Task updated successfully!");
  }

  closeEditModal();
}

/**
 * DELETE — Menghapus task berdasarkan ID.
 * @param {string} id - ID task
 */
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  showToast("Task deleted.");
}

/**
 * DELETE ALL COMPLETED — Menghapus semua task yang sudah selesai.
 */
function clearCompleted() {
  const count = tasks.filter(t => t.completed).length;
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderTasks();
  showToast(`${count} completed task${count !== 1 ? "s" : ""} cleared.`);
}

/* ═══════════════════════════════════════════════════════════════
   7. EDIT MODAL
   ═══════════════════════════════════════════════════════════════ */

/**
 * Membuka modal edit dan mengisi teks task yang akan diedit.
 * @param {string} id - ID task
 */
function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingId        = id;
  editInput.value  = task.text;
  setError(editError, null);

  editModal.classList.remove("hidden");
  editModal.classList.add("flex");

  // Fokus ke input agar aksesibel
  requestAnimationFrame(() => editInput.focus());
}

/**
 * Menutup modal edit dan mereset state.
 */
function closeEditModal() {
  editingId = null;
  editModal.classList.add("hidden");
  editModal.classList.remove("flex");
}

/* ═══════════════════════════════════════════════════════════════
   8. FILTER
   ═══════════════════════════════════════════════════════════════ */

/**
 * Mengubah filter aktif dan memperbarui tampilan tab + daftar task.
 * @param {string} filter - 'all' | 'active' | 'completed'
 */
function setFilter(filter) {
  activeFilter = filter;

  // Update kelas aktif pada tombol tab
  document.querySelectorAll(".filter-tab").forEach(btn => {
    if (btn.dataset.filter === filter) {
      btn.classList.add("active-tab");
    } else {
      btn.classList.remove("active-tab");
    }
  });

  renderTasks();
}

/* ═══════════════════════════════════════════════════════════════
   9. EVENT LISTENERS
   ═══════════════════════════════════════════════════════════════ */

/** Form submit — tambah task baru */
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();

  if (!text) {
    setError(inputError, "Please enter a task description.");
    taskInput.focus();
    return;
  }
  if (text.length > 120) {
    setError(inputError, "Maximum 120 characters.");
    return;
  }

  setError(inputError, null);
  addTask(text);
  taskInput.value = "";
  taskInput.focus();
});

/** Hapus error saat user mulai mengetik */
taskInput.addEventListener("input", () => setError(inputError, null));

/** Filter tabs — event delegation */
filterTabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-tab");
  if (btn) setFilter(btn.dataset.filter);
});

/** Clear completed button */
clearCompBtn.addEventListener("click", clearCompleted);

/** Modal: tombol Cancel */
modalCancel.addEventListener("click", closeEditModal);

/** Modal: tombol Save */
modalSave.addEventListener("click", saveEditTask);

/** Modal: simpan dengan Enter, tutup dengan Escape */
editInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter")  saveEditTask();
  if (e.key === "Escape") closeEditModal();
});

/** Tutup modal saat klik overlay (luar card) */
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

/** Tutup modal dengan tombol Escape dari mana saja */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && editingId !== null) closeEditModal();
});

/* ═══════════════════════════════════════════════════════════════
   10. INIT
   ═══════════════════════════════════════════════════════════════ */

/**
 * Inisialisasi aplikasi: muat data dari localStorage dan render.
 */
function init() {
  loadTasks();
  renderTasks();
}

// Jalankan saat DOM siap
init();
