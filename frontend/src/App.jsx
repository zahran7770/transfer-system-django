import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing  from './pages/Landing';
import Login    from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin   from './pages/Admin';

function PrivateRoute({ children, adminOnly }) {
    const token = localStorage.getItem('access');
    const role  = localStorage.getItem('role');
    if (!token) return <Navigate to="/login" replace />;
    if (adminOnly && role !== 'admin') return <Navigate to="/dashboard" replace />;
    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/"          element={<Landing />} />
                <Route path="/login"     element={<Login />} />
                <Route path="/register"  element={<Register />} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/admin"     element={<PrivateRoute adminOnly={true}><Admin /></PrivateRoute>} />
            </Routes>
        </BrowserRouter>
    );
}
