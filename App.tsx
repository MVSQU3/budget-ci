import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { BudgetProvider } from './src/context/BudgetContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <BudgetProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </BudgetProvider>
  );
}
