import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// Ekranları import et
import HomeScreen from "../screens/WelcomeScreen";
import RealTimePreviewScreen from "../screens/RealTimeScreen";
import EditAndPreviewScreen from "../screens/PhotoEditScreen";
import { COLORS } from "../constants/theme";

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Ana Sayfa") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Gerçek Zamanlı Önizleme") {
            iconName = focused ? "scan" : "scan-outline";
          } else if (route.name === "Düzenle ve Önizleme") {
            iconName = focused ? "sparkles" : "sparkles-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: COLORS.text,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          backdropFilter: "blur(10px)",
          borderTopWidth: 1,
          borderTopColor: COLORS.text,
          position: "absolute",
          height: 60,
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Ana Sayfa"
        component={HomeScreen}
        options={{
          tabBarLabel: "Ana Sayfa",
        }}
      />
      <Tab.Screen
        name="Gerçek Zamanlı Önizleme"
        component={RealTimePreviewScreen}
        options={{
          tabBarLabel: "Gerçek Zamanlı Önizleme",
        }}
      />
      <Tab.Screen
        name="Düzenle ve Önizleme"
        component={EditAndPreviewScreen}
        options={{
          tabBarLabel: "Düzenle ve Önizleme",
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
