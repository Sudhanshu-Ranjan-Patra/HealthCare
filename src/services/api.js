// src/services/api.js

const API_URL = "http://127.0.0.1:5001";

// Get patient data from backend
export async function getPatientData(patientId) {
    try {
        const response = await fetch(`${API_URL}/api/patients/${patientId}`);
        if (!response.ok) {
            throw new Error('Patient not found');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching patient data:', error);
        return null;
    }
}

// Get all patients
export async function getAllPatients() {
    try {
        const response = await fetch(`${API_URL}/api/patients`);
        if (!response.ok) {
            throw new Error('Failed to fetch patients');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

// Send sensor data (for testing)
export async function sendSensorData(data) {
    try {
        const response = await fetch(`${API_URL}/api/sensor-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Error sending sensor data:', error);
        return null;
    }
}

// WebSocket connection for real-time updates
export function connectWebSocket(onMessage) {
    const wsUrl = `ws://127.0.0.1:5001/ws`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('📡 WebSocket message received:', data);
            onMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
    };
    
    ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
    };
    
    return ws;
}