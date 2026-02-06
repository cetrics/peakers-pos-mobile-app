import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="database-selection" />
      <Stack.Screen name="login" /> {/* Changed from "index" to "login" */}
    </Stack>
  );
}
