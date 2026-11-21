
/* ==========================================
   NOTES APP
   HTML + CSS + JAVASCRIPT + JSONBIN
========================================== */


/* ==========================================
   1. JSONBIN CONFIGURATION
========================================== */

const BIN_ID = "6b00f00bffd5d16053d2770e";
const API_KEY = "$2a$10$GYyTXmKaxHsAvlZNxbH.BerfTlcPLJ2xAzf5LSBQ7fRtdkxJGjFEC";

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const STORAGE_KEY = "minimal_notes_backup";


/* ==========================================
   2. APP STATE
========================================== */

let notes = [];

let currentNoteId = null;
let currentFilter = "all";
let currentPage = "notes";

let isPinned = false;
let isLoading = false;
let saveTimer = null;

let isOnlineDatabase = false;


/* ==========================================
   3. DOM ELEMENTS
========================================== */

const notesPage = document.getElementById("notesPage");
const editorPage = document.getElementById("editorPage");
const settingsPage = document.getElementById("settingsPage");

const notesList = document.getElementById("notesList");
const emptyState = document.getElementById("emptyState");

const notesHeading = document.getElementById("notesHeading");
const notesCount = document.getElementById("notesCount");

const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

const addNoteButton = document.getElementById("addNoteButton");
const emptyCreateButton = document.getElementById("emptyCreateButton");

const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const noteCategory = document.getElementById("noteCategory");

const backButton = document.getElementById("backButton");
const pinButton = document.getElementById("pinButton");

const saveStatus = document.getElementById("saveStatus");
const wordCount = document.getElementById("wordCount");
const lastUpdated = document.getElementById("lastUpdated");

const settingsButton = document.getElementById("settingsButton");
const settingsBackButton = document.getElementById("settingsBackButton");

const bottomNavigation = document.getElementById("bottomNavigation");

const connectionStatus = document.getElementById("connectionStatus");
const connectionIndicator = document.getElementById("connectionIndicator");


/* ==========================================
   4. UTILITIES
========================================== */

function createId() {
    return "note_" + Date.now() + "_" +
        Math.random().toString(36).slice(2, 8);
}


function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return "";

    const now = new Date();

    const sameDay =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (sameDay) {
        return "Today · " + date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
        return "Yesterday · " + date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


function getWordCount(text) {
    const trimmed = text.trim();

    if (!trimmed) return 0;

    return trimmed.split(/\s+/).length;
}


function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, function (char) {
        const map = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return map[char];
    });
}


function getNotePreview(content) {
    if (!content) return "No additional text";

    return content.replace(/\s+/g, " ").trim();
}


/* ==========================================
   5. LOCAL STORAGE
========================================== */

function saveLocalBackup() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
        console.error("Local backup failed:", error);
    }
}


function loadLocalBackup() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);

        if (!data) return [];

        const parsed = JSON.parse(data);

        return Array.isArray(parsed) ? parsed : [];

    } catch (error) {
        console.error("Local backup load failed:", error);
        return [];
    }
}


/* ==========================================
   6. JSONBIN CONNECTION
========================================== */

async function loadFromJSONBin() {

    if (BIN_ID === "xxxx" || API_KEY === "xxxx") {
        throw new Error("JSONBin credentials have not been configured.");
    }

    const response = await fetch(JSONBIN_URL, {
        method: "GET",

        headers: {
            "X-Master-Key": API_KEY
        }
    });

    if (!response.ok) {
        throw new Error("Failed to load JSONBin data.");
    }

    const result = await response.json();

    const record = result.record;

    if (Array.isArray(record)) {
        return record;
    }

    if (record && Array.isArray(record.notes)) {
        return record.notes;
    }

    return [];
}


async function saveToJSONBin() {

    if (BIN_ID === "xxxx" || API_KEY === "xxxx") {
        throw new Error("JSONBin credentials have not been configured.");
    }

    const payload = {
        notes: notes,
        updatedAt: new Date().toISOString()
    };

    const response = await fetch(JSONBIN_URL, {
        method: "PUT",

        headers: {
            "Content-Type": "application/json",
            "X-Master-Key": API_KEY
        },

        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error("Failed to save JSONBin data.");
    }

    return true;
}


/* ==========================================
   7. CONNECTION STATUS
========================================== */

function updateConnectionStatus(status) {

    connectionStatus.textContent = status;

    connectionIndicator.classList.remove(
        "connected",
        "disconnected"
    );

    if (status === "Connected") {
        connectionIndicator.classList.add("connected");
    }

    if (status === "Offline" || status === "Local Backup") {
        connectionIndicator.classList.add("disconnected");
    }
}


/* ==========================================
   8. INITIALIZE APP
========================================== */

async function initializeApp() {

    updateConnectionStatus("Connecting...");

    const localNotes = loadLocalBackup();

    try {

        const cloudNotes = await loadFromJSONBin();

        notes = cloudNotes;

        isOnlineDatabase = true;

        saveLocalBackup();

        updateConnectionStatus("Connected");

    } catch (error) {

        console.warn("JSONBin unavailable:", error.message);

        notes = localNotes;

        isOnlineDatabase = false;

        updateConnectionStatus(
            BIN_ID === "xxxx" || API_KEY === "xxxx"
                ? "Local Backup"
                : "Offline"
        );
    }

    renderNotes();
}


/* ==========================================
   9. RENDER NOTES
========================================== */

function renderNotes() {

    let filteredNotes = [...notes];

    // Filter pinned notes
    if (currentFilter === "pinned") {
        filteredNotes = filteredNotes.filter(note => note.pinned);
    }

    // Search
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (searchTerm) {
        filteredNotes = filteredNotes.filter(note => {

            const title = (note.title || "").toLowerCase();
            const content = (note.content || "").toLowerCase();
            const category = (note.category || "").toLowerCase();

            return (
                title.includes(searchTerm) ||
                content.includes(searchTerm) ||
                category.includes(searchTerm)
            );
        });
    }

    // Pinned first
    filteredNotes.sort((a, b) => {

        if (a.pinned !== b.pinned) {
            return b.pinned - a.pinned;
        }

        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    // Update heading
    notesHeading.textContent =
        currentFilter === "pinned" ? "Pinned Notes" : "Your Notes";

    notesCount.textContent =
        filteredNotes.length +
        (filteredNotes.length === 1 ? " note" : " notes");

    // Render cards
    notesList.innerHTML = "";

    filteredNotes.forEach(note => {

        const card = document.createElement("article");

        card.className = "note-card";

        card.dataset.id = note.id;
        card.dataset.color = note.color || "default";

        card.innerHTML = `
            <div class="note-card-top">

                <span class="note-category">
                    ${escapeHTML(note.category || "Personal")}
                </span>

                ${
                    note.pinned
                    ? `<i class="fa-solid fa-thumbtack note-pin"></i>`
                    : ""
                }

            </div>

            <h3>
                ${escapeHTML(note.title || "Untitled")}
            </h3>

            <p>
                ${escapeHTML(getNotePreview(note.content))}
            </p>

            <div class="note-card-bottom">

                <span class="note-date">
                    ${formatDate(note.updatedAt)}
                </span>

                <button
                    class="note-menu-button"
                    data-delete="${note.id}"
                    aria-label="Delete note"
                >
                    <i class="fa-solid fa-trash"></i>
                </button>

            </div>
        `;

        // Open note
        card.addEventListener("click", function (event) {

            if (event.target.closest("[data-delete]")) return;

            openNote(note.id);
        });

        // Delete note
        const deleteButton = card.querySelector("[data-delete]");

        deleteButton.addEventListener("click", function (event) {

            event.stopPropagation();

            deleteNote(note.id);
        });

        notesList.appendChild(card);
    });

    // Empty state
    const hasNotes = filteredNotes.length > 0;

    emptyState.classList.toggle("hidden", hasNotes);
    notesList.classList.toggle("hidden", !hasNotes);

    // Hide floating button when empty state has its own create button
    addNoteButton.classList.toggle("hidden", !hasNotes);
}


/* ==========================================
   10. CREATE NOTE
========================================== */

function createNote() {

    const now = new Date().toISOString();

    const newNote = {
        id: createId(),
        title: "",
        content: "",
        category: "Personal",
        pinned: false,
        color: "default",
        createdAt: now,
        updatedAt: now
    };

    notes.unshift(newNote);

    currentNoteId = newNote.id;

    isPinned = false;

    saveLocalBackup();

    renderNotes();

    openEditor();
}


/* ==========================================
   11. OPEN NOTE
========================================== */

function openNote(id) {

    const note = notes.find(item => item.id === id);

    if (!note) return;

    currentNoteId = id;

    noteTitle.value = note.title || "";
    noteContent.value = note.content || "";
    noteCategory.value = note.category || "Personal";

    isPinned = Boolean(note.pinned);

    updatePinButton();

    updateWordCount();

    lastUpdated.textContent =
        note.createdAt === note.updatedAt
        ? "New note"
        : "Updated " + formatDate(note.updatedAt);

    setSaveStatus("saved");

    openEditor();
}


/* ==========================================
   12. EDITOR PAGE
========================================== */

function openEditor() {

    notesPage.classList.remove("active");
    settingsPage.classList.remove("active");

    editorPage.classList.add("active");

    bottomNavigation.classList.add("hidden");

    currentPage = "editor";

    setTimeout(() => {
        noteTitle.focus();
    }, 100);
}


function closeEditor() {

    editorPage.classList.remove("active");

    notesPage.classList.add("active");

    bottomNavigation.classList.remove("hidden");

    currentPage = "notes";

    renderNotes();
}


/* ==========================================
   13. UPDATE NOTE
========================================== */

function updateCurrentNote() {

    if (!currentNoteId) return;

    const note = notes.find(item => item.id === currentNoteId);

    if (!note) return;

    note.title = noteTitle.value.trim();
    note.content = noteContent.value;
    note.category = noteCategory.value;
    note.pinned = isPinned;

    note.updatedAt = new Date().toISOString();

    saveLocalBackup();

    updateWordCount();

    lastUpdated.textContent = "Edited just now";

    setSaveStatus("saving");

    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
        syncCurrentNote();
    }, 1000);
}


/* ==========================================
   14. AUTO SAVE + SYNC
========================================== */

async function syncCurrentNote() {

    setSaveStatus("saving");

    saveLocalBackup();

    try {

        await saveToJSONBin();

        isOnlineDatabase = true;

        updateConnectionStatus("Connected");

        setSaveStatus("saved");

    } catch (error) {

        console.warn("Cloud save failed:", error.message);

        isOnlineDatabase = false;

        updateConnectionStatus("Local Backup");

        setSaveStatus("saved");
    }
}


/* ==========================================
   15. SAVE STATUS
========================================== */

function setSaveStatus(status) {

    saveStatus.classList.remove("saving", "error");

    if (status === "saving") {

        saveStatus.classList.add("saving");

        saveStatus.innerHTML = `
            <span class="save-dot"></span>
            <span>Saving...</span>
        `;

    } else if (status === "error") {

        saveStatus.classList.add("error");

        saveStatus.innerHTML = `
            <span class="save-dot"></span>
            <span>Error</span>
        `;

    } else {

        saveStatus.innerHTML = `
            <span class="save-dot"></span>
            <span>Saved</span>
        `;
    }
}


/* ==========================================
   16. DELETE NOTE
========================================== */

async function deleteNote(id) {

    const confirmDelete = confirm(
        "Delete this note?"
    );

    if (!confirmDelete) return;

    notes = notes.filter(note => note.id !== id);

    saveLocalBackup();

    renderNotes();

    // Save deleted state to cloud
    try {

        await saveToJSONBin();

        updateConnectionStatus("Connected");

    } catch (error) {

        updateConnectionStatus("Local Backup");
    }

    // If deleting note from editor
    if (currentNoteId === id) {

        currentNoteId = null;

        closeEditor();
    }
}


/* ==========================================
   17. PIN NOTE
========================================== */

function updatePinButton() {

    pinButton.classList.toggle("active", isPinned);

    pinButton.innerHTML = isPinned
        ? `<i class="fa-solid fa-thumbtack"></i>`
        : `<i class="fa-solid fa-thumbtack"></i>`;
}


function togglePin() {

    isPinned = !isPinned;

    updatePinButton();

    updateCurrentNote();
}


/* ==========================================
   18. WORD COUNT
========================================== */

function updateWordCount() {

    const count = getWordCount(noteContent.value);

    wordCount.textContent =
        count + (count === 1 ? " word" : " words");
}


/* ==========================================
   19. SEARCH
========================================== */

searchInput.addEventListener("input", function () {

    clearSearch.classList.toggle(
        "hidden",
        searchInput.value.length === 0
    );

    renderNotes();
});


clearSearch.addEventListener("click", function () {

    searchInput.value = "";

    clearSearch.classList.add("hidden");

    renderNotes();

    searchInput.focus();
});


/* ==========================================
   20. FILTER
========================================== */

document.querySelectorAll(".filter-button").forEach(button => {

    button.addEventListener("click", function () {

        document.querySelectorAll(".filter-button").forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");

        currentFilter = this.dataset.filter;

        renderNotes();
    });
});


/* ==========================================
   21. CREATE BUTTONS
========================================== */

addNoteButton.addEventListener("click", createNote);

emptyCreateButton.addEventListener("click", createNote);


/* ==========================================
   22. EDITOR INPUT EVENTS
========================================== */

noteTitle.addEventListener("input", updateCurrentNote);

noteContent.addEventListener("input", function () {

    updateWordCount();

    updateCurrentNote();
});

noteCategory.addEventListener("change", updateCurrentNote);


/* ==========================================
   23. PIN BUTTON
========================================== */

pinButton.addEventListener("click", togglePin);


/* ==========================================
   24. BACK BUTTON
========================================== */

backButton.addEventListener("click", function () {

    clearTimeout(saveTimer);

    if (currentNoteId) {
        syncCurrentNote();
    }

    closeEditor();
});


/* ==========================================
   25. SETTINGS
========================================== */

function openSettings() {

    notesPage.classList.remove("active");
    editorPage.classList.remove("active");

    settingsPage.classList.add("active");

    bottomNavigation.classList.remove("hidden");

    currentPage = "settings";
}


function openNotesPage() {

    settingsPage.classList.remove("active");
    editorPage.classList.remove("active");

    notesPage.classList.add("active");

    bottomNavigation.classList.remove("hidden");

    currentPage = "notes";

    renderNotes();
}


settingsButton.addEventListener("click", openSettings);

settingsBackButton.addEventListener("click", openNotesPage);


/* ==========================================
   26. BOTTOM NAVIGATION
========================================== */

document.querySelectorAll(".nav-item").forEach(button => {

    button.addEventListener("click", function () {

        const targetPage = this.dataset.page;

        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");

        if (targetPage === "notes") {
            openNotesPage();
        }

        if (targetPage === "settings") {
            openSettings();
        }
    });
});


/* ==========================================
   27. INTERNET STATUS
========================================== */

window.addEventListener("online", function () {

    if (currentPage !== "editor") {
        updateConnectionStatus("Connecting...");
    }

    if (currentPage === "editor") {
        syncCurrentNote();
    }
});


window.addEventListener("offline", function () {

    updateConnectionStatus("Offline");
});


/* ==========================================
   28. START APP
========================================== */

initializeApp();
