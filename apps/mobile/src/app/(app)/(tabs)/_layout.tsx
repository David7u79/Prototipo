import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type ColorValue, type GestureResponderEvent } from 'react-native';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { colors, gradients } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];
type TabButtonProps = {
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityState?: { selected?: boolean };
};

function tabIcon(name: SymbolName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} tintColor={color} size={size} />;
  };
}

/** Raised gradient button in the middle of the bar: start training in one tap. */
function TrainButton({ onPress, accessibilityState }: TabButtonProps) {
  return (
    <View style={styles.trainSlot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Entrenar"
        accessibilityState={accessibilityState}
        onPress={onPress}
        style={({ pressed }) => [styles.trainButton, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <SymbolView name={{ ios: 'plus', android: 'add' }} tintColor={colors.onAccent} size={30} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: styles.bar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', headerShown: false, tabBarIcon: tabIcon({ ios: 'house.fill', android: 'home' }) }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: tabIcon({ ios: 'calendar', android: 'calendar_month' }),
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Entrenar',
          tabBarLabel: () => null,
          tabBarButton: (props) => <TrainButton {...(props as TabButtonProps)} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progreso',
          tabBarIcon: tabIcon({ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: tabIcon({ ios: 'person.crop.circle', android: 'account_circle' }) }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 6,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trainSlot: { flex: 1, alignItems: 'center' },
  trainButton: {
    top: -18,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: gradients.primary,
    borderWidth: 4,
    borderColor: colors.background,
  },
});
