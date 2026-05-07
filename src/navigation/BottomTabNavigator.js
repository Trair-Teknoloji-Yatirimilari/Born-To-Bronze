import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../screens/WelcomeScreen";
import EditAndPreviewScreen from "../screens/PhotoEditScreen";
import SharedPhotosScreen from "../screens/SharedPhotosScreen";
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
          } else if (route.name === "Düzenle ve Önizleme") {
            iconName = focused ? "sparkles" : "sparkles-outline";
          } else if (route.name === "Paylaşımlarım") {
            iconName = focused ? "share-social" : "share-social-outline";
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
        name="Düzenle ve Önizleme"
        component={EditAndPreviewScreen}
        options={{
          tabBarLabel: "Düzenle ve Önizleme",
        }}
      />
      <Tab.Screen
        name="Paylaşımlarım"
        component={SharedPhotosScreen}
        options={{
          tabBarLabel: "Paylaşımlarım",
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
