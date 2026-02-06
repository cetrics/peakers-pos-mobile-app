import { Tabs } from "expo-router";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabLayout() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#fff" }}
      edges={["bottom"]}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0B1446",
          tabBarInactiveTintColor: "#666",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#eee",
            height: Platform.OS === "ios" ? 85 : 70, // Taller on iOS
            paddingBottom: Platform.OS === "ios" ? 30 : 10, // More padding on iOS
            paddingTop: 8,
            paddingHorizontal: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
            marginBottom: Platform.OS === "ios" ? 0 : 4, // Adjust label position
          },
          tabBarIconStyle: {
            marginTop: Platform.OS === "ios" ? 0 : 4, // Adjust icon position
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <Icon name="view-dashboard" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="sales"
          options={{
            title: "Sales",
            tabBarIcon: ({ color, size }) => (
              <Icon name="cash-register" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="products"
          options={{
            title: "Products",
            tabBarIcon: ({ color, size }) => (
              <Icon name="package-variant" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ color, size }) => (
              <Icon name="clipboard-list" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
