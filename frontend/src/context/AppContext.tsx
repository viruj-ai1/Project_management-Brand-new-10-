import React, { useState, createContext, useEffect } from 'react';
import axios from 'axios';


const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [uRes, pRes, tRes] = await Promise.all([
        axios.get(`${API_BASE}/users`),
        axios.get(`${API_BASE}/projects`),
        axios.get(`${API_BASE}/tasks`)
      ]);
      setUsers(uRes.data);
      setProjects(pRes.data);
      setTasks(tRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addUser = async (userData: any) => {
    try {
      const res = await axios.post(`${API_BASE}/users`, userData);
      setUsers(prev => [...prev, res.data]);
      return res.data; // return created user so callers can read the server-assigned id
    } catch (error) {
      console.error('Error adding user:', error);
      throw error; // re-throw so callers can handle
    }
  };

  const updateUser = async (userId: string, userUpdates: any) => {
    try {
      const res = await axios.put(`${API_BASE}/users/${userId}`, userUpdates);
      setUsers(prev => prev.map(u => u.id === userId ? res.data : u));
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(res.data);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  // Returns { success: true } or throws with error.response.data.detail
  const changePassword = async (userId: string, oldPassword: string, newPassword: string) => {
    const res = await axios.post(`${API_BASE}/change-password`, { userId, oldPassword, newPassword });
    return res.data;
  };

  // Admin resets a subordinate's password — no old password required
  const adminResetPassword = async (targetUserId: string, newPassword: string) => {
    const res = await axios.post(`${API_BASE}/admin-reset-password`, { targetUserId, newPassword });
    return res.data;
  };

  const addProject = async (projectData: any) => {
    try {
      const res = await axios.post(`${API_BASE}/projects`, projectData);
      setProjects(prev => [...prev, res.data]);
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const addTask = async (taskData: any) => {
    try {
      const res = await axios.post(`${API_BASE}/tasks`, taskData);
      setTasks(prev => [...prev, res.data]);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const addTasksBulk = async (tasksData: any[]) => {
    try {
      const res = await axios.post(`${API_BASE}/tasks/bulk`, { tasks: tasksData });
      setTasks(prev => [...prev, ...res.data]);
    } catch (error) {
      console.error('Error adding bulk tasks:', error);
    }
  };



  const updateTask = async (taskId: string, taskUpdates: any) => {
    try {
      const res = await axios.put(`${API_BASE}/tasks/${taskId}`, taskUpdates);
      setTasks(tasks.map(t => t.id === taskId ? res.data : t));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const updateProject = async (projectId: string, projectUpdates: any) => {
    try {
      const res = await axios.put(`${API_BASE}/projects/${projectId}`, projectUpdates);
      setProjects(projects.map(p => p.id === projectId ? res.data : p));
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      const res = await axios.put(`${API_BASE}/projects/${projectId}`, { status: newStatus });
      setProjects(projects.map(p => p.id === projectId ? res.data : p));
    } catch (error) {
      console.error('Error updating project status:', error);
    }
  };


  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      users, addUser, updateUser, changePassword, adminResetPassword,
      projects, addProject, updateProject,
      tasks, addTask, addTasksBulk, updateTask,
      updateProjectStatus
    }}>
      {children}
    </AppContext.Provider>
  );
};


