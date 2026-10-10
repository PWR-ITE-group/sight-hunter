import React from 'react';
import { Tabs } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          elevation: 0,
          shadowOffset: { width: 0, height: -1 },
          shadowColor: Colors.border,
          shadowOpacity: 0.5,
          shadowRadius: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Odkrycia',
          tabBarIcon: ({ color }) => <Feather name="film" size={24} color={color} />,
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
        name="index"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Feather name="map-pin" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Sklep',
          tabBarIcon: ({ color }) => <Feather name="shopping-bag" size={24} color={color} />,
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
