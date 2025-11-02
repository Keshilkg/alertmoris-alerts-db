// admin-alerts.js
// Configuration - UPDATE THESE WITH YOUR ACTUAL URLS
const GITHUB_BASE_URL = 'https://keshilkg.github.io/alertmoris-alerts-db';
const ACTIVE_ALERTS_URL = `${GITHUB_BASE_URL}/active-alerts.json`;
const PAST_ALERTS_URL = `${GITHUB_BASE_URL}/past-alerts.json`;
const TEMPLATES_URL = `${GITHUB_BASE_URL}/alert-templates.json`;

// Global variables
let currentAlerts = [];
let pastAlerts = [];
let templates = [];
let editingAlertId = null;

// Tab switching
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Load data for the tab
    if (tabName === 'active') loadActiveAlerts();
    if (tabName === 'past') loadPastAlerts();
    if (tabName === 'templates') loadTemplates();
}

// Instruction management
function addInstruction() {
    const container = document.getElementById('instructionsContainer');
    const newInstruction = document.createElement('div');
    newInstruction.className = 'instruction-item';
    newInstruction.innerHTML = `
        <input type="text" placeholder="Enter safety instruction..." class="instruction-input">
        <button type="button" class="btn btn-secondary" onclick="removeInstruction(this)">Remove</button>
    `;
    container.appendChild(newInstruction);
}

function removeInstruction(button) {
    const container = document.getElementById('instructionsContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

function getInstructions() {
    const inputs = document.querySelectorAll('.instruction-input');
    const instructions = [];
    inputs.forEach(input => {
        if (input.value.trim()) {
            instructions.push(input.value.trim());
        }
    });
    return instructions;
}

// Template loading
async function loadTemplates() {
    try {
        const response = await fetch(TEMPLATES_URL + '?t=' + Date.now());
        const data = await response.json();
        templates = data.templates;
        displayTemplates();
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

function displayTemplates() {
    const container = document.getElementById('templatesList');
    container.innerHTML = templates.map(template => `
        <div class="alert-card ${template.default_level}">
            <div class="alert-header">
                <div class="alert-title">${template.icon} ${template.name}</div>
            </div>
            <div class="alert-meta">
                Level: ${template.default_level} | Severity: ${template.default_severity}
            </div>
            <div class="alert-actions">
                <button class="btn" onclick="useTemplate('${template.id}')">Use This Template</button>
            </div>
        </div>
    `).join('');
}

function useTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (template) {
        document.getElementById('alertType').value = template.id;
        document.getElementById('alertLevel').value = template.default_level;
        document.getElementById('alertSeverity').value = template.default_severity;
        document.getElementById('alertSource').value = template.default_source;
        
        // Clear and set instructions
        const container = document.getElementById('instructionsContainer');
        container.innerHTML = '';
        template.default_instructions.forEach(instruction => {
            addInstruction();
            const inputs = container.querySelectorAll('.instruction-input');
            inputs[inputs.length - 1].value = instruction;
        });
        
        showStatus(`Loaded ${template.name} template`, 'success');
        switchTab('create');
    }
}

// Alert management
function previewAlert() {
    const alertData = collectFormData();
    if (alertData) {
        document.getElementById('jsonOutput').textContent = JSON.stringify(alertData, null, 2);
        showStatus('Alert preview generated successfully!', 'success');
    }
}

function generateJSON() {
    const alertData = collectFormData();
    if (alertData) {
        const jsonOutput = {
            alerts: [alertData],
            last_updated: new Date().toISOString()
        };
        document.getElementById('jsonOutput').textContent = JSON.stringify(jsonOutput, null, 2);
        showStatus('JSON generated! Copy this to your GitHub file.', 'info');
    }
}

function collectFormData() {
    const type = document.getElementById('alertType').value;
    const level = document.getElementById('alertLevel').value;
    const title = document.getElementById('alertTitle').value;
    const description = document.getElementById('alertDescription').value;
    const area = document.getElementById('alertArea').value;
    const severity = document.getElementById('alertSeverity').value;
    const source = document.getElementById('alertSource').value;
    const instructions = getInstructions();

    if (!type || !level || !title || !description || !area || !severity || !source) {
        showStatus('Please fill in all required fields', 'error');
        return null;
    }

    if (instructions.length === 0) {
        showStatus('Please add at least one safety instruction', 'error');
        return null;
    }

    return {
        id: editingAlertId || Date.now(),
        type: type,
        level: level,
        title: title,
        description: description,
        time: "Just now",
        area: area,
        severity: severity,
        active: true,
        instructions: instructions,
        source: source,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}

// Load and display alerts
async function loadActiveAlerts() {
    try {
        const response = await fetch(ACTIVE_ALERTS_URL + '?t=' + Date.now());
        const data = await response.json();
        currentAlerts = data.alerts || [];
        displayActiveAlerts();
    } catch (error) {
        console.error('Error loading active alerts:', error);
        showStatus('Error loading active alerts', 'error');
    }
}

async function loadPastAlerts() {
    try {
        const response = await fetch(PAST_ALERTS_URL + '?t=' + Date.now());
        const data = await response.json();
        pastAlerts = data.alerts || [];
        displayPastAlerts();
    } catch (error) {
        console.error('Error loading past alerts:', error);
        showStatus('Error loading past alerts', 'error');
    }
}

function displayActiveAlerts() {
    const container = document.getElementById('activeAlertsList');
    if (currentAlerts.length === 0) {
        container.innerHTML = '<p>No active alerts</p>';
        return;
    }

    container.innerHTML = currentAlerts.map(alert => `
        <div class="alert-card ${alert.level}">
            <div class="alert-header">
                <div class="alert-title">${getAlertIcon(alert.type)} ${alert.title}</div>
            </div>
            <div class="alert-meta">
                ${alert.area} • ${alert.severity} severity • ${alert.time}
            </div>
            <p>${alert.description}</p>
            <div class="alert-actions">
                <button class="btn" onclick="editAlert(${alert.id})">Edit</button>
                <button class="btn btn-secondary" onclick="archiveAlert(${alert.id})">Archive</button>
                <button class="btn btn-danger" onclick="deleteAlert(${alert.id}, 'active')">Delete</button>
            </div>
        </div>
    `).join('');
}

function displayPastAlerts() {
    const container = document.getElementById('pastAlertsList');
    if (pastAlerts.length === 0) {
        container.innerHTML = '<p>No past alerts</p>';
        return;
    }

    container.innerHTML = pastAlerts.map(alert => `
        <div class="alert-card ${alert.level}">
            <div class="alert-header">
                <div class="alert-title">${getAlertIcon(alert.type)} ${alert.title}</div>
            </div>
            <div class="alert-meta">
                ${alert.area} • ${alert.severity} severity • ${alert.time}
            </div>
            <p>${alert.description}</p>
            <div class="alert-actions">
                <button class="btn" onclick="editAlert(${alert.id})">Edit</button>
                <button class="btn btn-success" onclick="reactivateAlert(${alert.id})">Reactivate</button>
                <button class="btn btn-danger" onclick="deleteAlert(${alert.id}, 'past')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Alert actions
function editAlert(alertId) {
    const allAlerts = [...currentAlerts, ...pastAlerts];
    const alert = allAlerts.find(a => a.id === alertId);
    if (alert) {
        editingAlertId = alert.id;
        
        // Fill the form
        document.getElementById('alertType').value = alert.type;
        document.getElementById('alertLevel').value = alert.level;
        document.getElementById('alertTitle').value = alert.title;
        document.getElementById('alertDescription').value = alert.description;
        document.getElementById('alertArea').value = alert.area;
        document.getElementById('alertSeverity').value = alert.severity;
        document.getElementById('alertSource').value = alert.source;
        
        // Fill instructions
        const container = document.getElementById('instructionsContainer');
        container.innerHTML = '';
        alert.instructions.forEach((instruction, index) => {
            if (index === 0) {
                container.querySelector('.instruction-input').value = instruction;
            } else {
                addInstruction();
                const inputs = container.querySelectorAll('.instruction-input');
                inputs[inputs.length - 1].value = instruction;
            }
        });
        
        switchTab('create');
        showStatus(`Editing alert: ${alert.title}`, 'info');
    }
}

function archiveAlert(alertId) {
    if (confirm('Are you sure you want to archive this alert?')) {
        showStatus('To archive an alert, move it from active-alerts.json to past-alerts.json in GitHub', 'info');
    }
}

function reactivateAlert(alertId) {
    if (confirm('Are you sure you want to reactivate this alert?')) {
        showStatus('To reactivate an alert, move it from past-alerts.json to active-alerts.json in GitHub', 'info');
    }
}

function deleteAlert(alertId, type) {
    if (confirm('Are you sure you want to delete this alert?')) {
        showStatus(`To delete this alert, remove it from ${type}-alerts.json in GitHub`, 'info');
    }
}

// Helper functions
function getAlertIcon(type) {
    const icons = {
        cyclone: '🌀',
        flood: '🌊',
        tsunami: '🌊',
        rain: '🌧️',
        heat: '🌡️',
        earthquake: '🌍'
    };
    return icons[type] || '⚠️';
}

function showStatus(message, type) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadTemplates();
    // Add initial instruction field
    addInstruction();
});
