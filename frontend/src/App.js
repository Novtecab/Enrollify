import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Universities from './pages/Universities';
import Applications from './pages/Applications';
import Documents from './pages/Documents';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/universities" 
                element={
                  <ProtectedRoute>
                    <Universities />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/applications" 
                element={
                  <ProtectedRoute>
                    <Applications />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/documents" 
                element={
                  <ProtectedRoute>
                    <Documents />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;