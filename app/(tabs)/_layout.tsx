import { Tabs, useRouter, useSegments } from 'expo-router';
import { Home, Search, Ticket, User, Sparkles } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';

import colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';

const TAB_BAR_WIDTH = 280;

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  // Define the visible tabs in order (AI in the middle!)
  const visibleTabNames = ['index', 'explore', 'ai', 'bookings', 'profile'];
  
  // Filter and sort routes to match our order
  const visibleRoutes = visibleTabNames
    .map(name => state.routes.find((route: any) => route.name === name))
    .filter(Boolean);

  return (
    <View style={[styles.floatingContainer, { bottom: insets.bottom > 0 ? insets.bottom + 4 : 20 }]}>
      <View style={styles.tabBar}>
        <BlurView
          intensity={80}
          tint="light"
          style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: 'hidden' }]}
        />
        {visibleRoutes.map((route: any) => {
          const isFocused = state.index === state.routes.indexOf(route);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Cor cinzenta escura para ativo, cinzenta clara para inativo
          // All tabs use the same colors now
          const color = isFocused ? '#1a1a1a' : '#999999';
          const fill = isFocused ? '#1a1a1a' : 'none';

          let IconComponent;
          switch (route.name) {
            case 'index':
              IconComponent = <Home size={24} color={color} fill={fill} strokeWidth={1.5} />;
              break;
            case 'explore':
              IconComponent = <Search size={24} color={color} strokeWidth={isFocused ? 2.5 : 1.5} />;
              break;
            case 'ai':
              IconComponent = <Sparkles size={24} color={color} fill={isFocused ? color : 'none'} strokeWidth={1.5} />;
              break;
            case 'bookings':
              IconComponent = <Ticket size={24} color={color} fill={fill} strokeWidth={1.5} />;
              break;
            case 'profile':
              IconComponent = <User size={24} color={color} fill={fill} strokeWidth={1.5} />;
              break;
            default:
              IconComponent = null;
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
            >
              {IconComponent}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  tabBar: {
    flexDirection: 'row',
    width: TAB_BAR_WIDTH,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingLeft: 32,
  },
  tabItem: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function TabLayout() {
  const { t } = useLanguage();
  
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.feed'),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Concierge',
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.settings'),
        }}
      />
    </Tabs>
  );
}
