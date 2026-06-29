import React from "react";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useFonts, Fraunces_500Medium, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BarChart2, Calculator, TrendingUp } from "lucide-react-native";

import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import CalculatorScreen from "./src/screens/CalculatorScreen";
import ProgressScreen from "./src/screens/ProgressScreen";
import WealthGuideScreen from "./src/screens/WealthGuideScreen";
import { THEME } from "./src/theme";

WebBrowser.maybeCompleteAuthSession();

const Tab = createBottomTabNavigator();

function SignOutButton({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={busy} style={{ marginRight: 14, paddingVertical: 6 }}>
      {busy ? (
        <ActivityIndicator size="small" color={THEME.colors.textSecondary} />
      ) : (
        <Text style={{ color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.uiMedium }}>
          Sign out
        </Text>
      )}
    </TouchableOpacity>
  );
}

function MainTabs() {
  const { signOut, signingOut } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: THEME.colors.background,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
        },
        headerTitleStyle: {
          fontFamily: THEME.fonts.display,
          fontSize: 20,
          color: THEME.colors.primary,
        },
        headerTintColor: THEME.colors.text,
        tabBarStyle: {
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textSecondary,
        tabBarLabelStyle: { fontFamily: THEME.fonts.uiMedium, fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Calculator") return <Calculator size={size} color={color} strokeWidth={1.75} />;
          if (route.name === "Wealth Guide") return <BarChart2 size={size} color={color} strokeWidth={1.75} />;
          return <TrendingUp size={size} color={color} strokeWidth={1.75} />;
        },
      })}
    >
      <Tab.Screen
        name="Calculator"
        component={CalculatorScreen}
        options={{ headerRight: () => <SignOutButton onPress={() => void signOut()} busy={signingOut} /> }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ headerRight: () => <SignOutButton onPress={() => void signOut()} busy={signingOut} /> }}
      />
      <Tab.Screen
        name="Wealth Guide"
        component={WealthGuideScreen}
        options={{ headerRight: () => <SignOutButton onPress={() => void signOut()} busy={signingOut} /> }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { isReady, isSignedIn } = useAuth();
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: THEME.colors.background }}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }
  if (!isSignedIn) return <LoginScreen />;
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <MainTabs />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: THEME.colors.background }}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
