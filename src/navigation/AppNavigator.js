import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabNavigator from './BottomTabNavigator';
import PhotoEditScreen from "../screens/PhotoEditScreen";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen name="PhotoEdit" component={PhotoEditScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
