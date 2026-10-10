import React from 'react';
import { Tabs } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import TabBarIcon from '../../components/layout/TabBarIcon';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#208AEF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          elevation: 0,
          shadowOffset: { width: 0, height: -1 },
          shadowColor: '#E2E8F0',
          shadowOpacity: 0.5,
          shadowRadius: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Feather name="map-pin" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Odkrycia',
          tabBarIcon: ({ color }) => <Feather name="film" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="daily"
        options={{
          title: 'Quiz',
          tabBarIcon: ({ color }) => <TabBarIcon name="brain" size={20} color={color} badge={3} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color }) => <FontAwesome5 name="trophy" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
