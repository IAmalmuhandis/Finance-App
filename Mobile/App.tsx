import React from "react";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LayoutDashboard, TrendingUp, List, Building2, Upload, BarChart2 } from "lucide-react-native";

import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import AccountsScreen from "./src/screens/AccountsScreen";
import UploadScreen from "./src/screens/UploadScreen";
import ReportsScreen from "./src/screens/ReportsScreen";
import TrackerScreen from "./src/screens/TrackerScreen";
import TransactionsScreen from "./src/screens/TransactionsScreen";
import { THEME } from "./src/theme";

WebBrowser.maybeCompleteAuthSession();

const Tab = createBottomTabNavigator();

const buildTabOptions = (signOut: () => void, signingOut: boolean) => ({
  headerStyle: {
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTintColor: THEME.colors.text,
  headerTitleStyle: { fontWeight: "600" as const, fontSize: 17 },
  headerRight: () => (
    <TouchableOpacity
      onPress={() => void signOut()}
      disabled={signingOut}
      style={{ marginRight: 14, paddingVertical: 6, paddingHorizontal: 4, minWidth: 72, alignItems: "flex-end" }}
      hitSlop={8}
    >
      {signingOut ? (
        <ActivityIndicator size="small" color={THEME.colors.textSecondary} />
      ) : (
        <Text style={{ color: THEME.colors.textSecondary, fontSize: 14 }}>Sign out</Text>
      )}
    </TouchableOpacity>
  ),
  tabBarStyle: {
    backgroundColor: THEME.colors.background,
    borderTopColor: THEME.colors.border,
    paddingBottom: 8,
    paddingTop: 8,
    height: 64,
  },
  tabBarActiveTintColor: THEME.colors.primary,
  tabBarInactiveTintColor: THEME.colors.textSecondary,
});

function MainTabs() {
  const { signOut, signingOut } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const base = buildTabOptions(signOut, signingOut);
        return {
          ...base,
          headerTitle: route.name === "Tracker" ? "Formula" : route.name,
          tabBarLabel: route.name === "Tracker" ? "Formula" : route.name,
          tabBarLabelStyle: { fontSize: 9 },
          tabBarItemStyle: { minWidth: 48 },
          tabBarIcon: ({ color, size }) => {
            if (route.name === "Dashboard") return <LayoutDashboard size={size} color={color} />;
            if (route.name === "Accounts") return <Building2 size={size} color={color} />;
            if (route.name === "Upload") return <Upload size={size} color={color} />;
            if (route.name === "Transactions") return <List size={size} color={color} />;
            if (route.name === "Reports") return <BarChart2 size={size} color={color} />;
            if (route.name === "Tracker") return <TrendingUp size={size} color={color} />;
            return null;
          },
        };
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Tracker" component={TrackerScreen} />
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
  if (!isSignedIn) {
    return <LoginScreen />;
  }
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <MainTabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
