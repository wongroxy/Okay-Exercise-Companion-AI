import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (googleToken: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));

    useEffect(() => {
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                // Check expiration
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    // Ideally we should fetch user details from backend, but for now we can decode or use stored user
                    const storedUser = localStorage.getItem('authUser');
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    }
                }
            } catch (e) {
                logout();
            }
        }
    }, [token]);

    const login = async (googleToken: string) => {
        try {
            const response = await fetch('http://localhost:3000/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: googleToken }),
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authUser', JSON.stringify(data.user));
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
