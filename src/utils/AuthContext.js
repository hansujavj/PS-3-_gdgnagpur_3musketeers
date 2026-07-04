/**
 * AuthContext.js
 * Provides logout callback to any screen via React Context.
 * Avoids prop drilling through navigators.
 */
import React, { createContext, useContext } from 'react';

const AuthContext = createContext({ onLogout: async () => { } });

export const AuthProvider = AuthContext.Provider;
export const useAuth = () => useContext(AuthContext);
