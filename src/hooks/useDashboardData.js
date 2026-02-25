// src/hooks/useDashboardData.js
import { useState, useEffect } from 'react';
import { getPatientData, connectWebSocket } from '../services/api';

const useDashboardData = () => {
    const [stats, setStats] = useState([]);
    const [analytics, setAnalytics] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [patientData, setPatientData] = useState(null);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        // Connect to WebSocket for real-time data
        const ws = connectWebSocket((data) => {
            console.log('Received data:', data);
            
            if (data.type === 'sensor-data') {
                setPatientData(data.data);
                
                // Update stats with real-time data
                setStats([
                    { id: 1, title: "Heart Rate", value: `${data.data.heart_rate} bpm`, status: data.data.severity === 'low' ? 'normal' : 'warning', icon: '❤️' },
                    { id: 2, title: "SpO2", value: `${data.data.spo2}%`, status: 'normal', icon: '💨' },
                    { id: 3, title: "Blood Pressure", value: `${data.data.predicted_bp_systolic}/${data.data.predicted_bp_diastolic}`, status: data.data.severity === 'low' ? 'normal' : 'warning', icon: '🩺' },
                    { id: 4, title: "Temperature", value: `${data.data.temperature}°C`, status: 'normal', icon: '🌡️' },
                ]);
            }
            else if (data.type === 'alert') {
                setAlerts(prev => [...prev, data]);
                console.log('Alert received:', data);
            }
        });

        // Initial data load
        setTimeout(() => {
            setAnalytics([
                { id: 1, title: "Total Patients", value: "156", change: "+12%" },
                { id: 2, title: "Critical Cases", value: "8", change: "+3%" },
                { id: 3, title: "Average Stay", value: "4.2 days", change: "-5%" },
            ]);
            
            setPatients([
                { id: 'pt001', name: 'John Doe', status: 'normal', heart_rate: 72, spo2: 98, bp: '120/80' },
                { id: 'pt002', name: 'Jane Smith', status: 'critical', heart_rate: 95, spo2: 92, bp: '145/90' },
                { id: 'pt003', name: 'Bob Wilson', status: 'normal', heart_rate: 68, spo2: 99, bp: '118/75' },
            ]);
            
            setLoading(false);
        }, 1000);

        return () => {
            if (ws) ws.close();
        };
    }, []);

    return { stats, analytics, patients, loading, patientData, alerts };
};

export default useDashboardData;