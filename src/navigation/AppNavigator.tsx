import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MonthScreen } from '../screens/MonthScreen';
import { OperationFormScreen } from '../screens/OperationFormScreen';
import { AccountsScreen } from '../screens/AccountsScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { CeilingsScreen } from '../screens/CeilingsScreen';
import { SyncJoinScreen } from '../screens/SyncJoinScreen';
import { SyncScreen } from '../screens/SyncScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Mois"
          component={MonthScreen}
          options={{ title: 'budget-ci' }}
        />
        <Stack.Screen
          name="OperationForm"
          component={OperationFormScreen}
          options={{ title: 'Opération' }}
        />
        <Stack.Screen
          name="Comptes"
          component={AccountsScreen}
          options={{ title: 'Comptes' }}
        />
        <Stack.Screen
          name="Categories"
          component={CategoriesScreen}
          options={{ title: 'Catégories' }}
        />
        <Stack.Screen
          name="Plafonds"
          component={CeilingsScreen}
          options={{ title: 'Plafonds du mois' }}
        />
        <Stack.Screen
          name="Synchronisation"
          component={SyncScreen}
          options={{
            title: 'Synchronisation',
            headerStyle: { backgroundColor: '#F5F7FF' },
            headerTintColor: '#4338CA',
            contentStyle: { backgroundColor: '#F5F7FF' },
          }}
        />
        <Stack.Screen
          name="Rejoindre"
          component={SyncJoinScreen}
          options={{
            title: 'Rejoindre',
            headerStyle: { backgroundColor: '#F5F7FF' },
            headerTintColor: '#4338CA',
            contentStyle: { backgroundColor: '#F5F7FF' },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
