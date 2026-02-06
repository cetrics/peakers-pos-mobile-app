import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DatabaseSelectionScreen() {
  const [dbName, setDbName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleConnect = async () => {
    if (!dbName.trim()) {
      Alert.alert("Error", "Please enter a database name");
      return;
    }

    setLoading(true);

    try {
      // Test if we can connect to this database
      const response = await fetch("http://192.168.1.66:5000/api/test-db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ db_name: dbName }),
      });

      const data = await response.json();

      if (data.success) {
        // Store the database name globally
        await AsyncStorage.setItem("db_name", dbName);

        // Navigate to your existing login screen
        router.replace("/(auth)/login");
      } else {
        Alert.alert(
          "Connection Failed",
          data.message || "Cannot connect to database",
        );
      }
    } catch (error) {
      Alert.alert("Error", "Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to Database</Text>
      <Text style={styles.subtitle}>Enter your company's database name</Text>

      <TextInput
        placeholder="e.g., company_pos, shop_pos, etc."
        placeholderTextColor="#999"
        style={styles.input}
        value={dbName}
        onChangeText={setDbName}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleConnect}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>CONNECT</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1c3d",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    opacity: 0.8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 24,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#f9a825",
    padding: 16,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
    color: "#000",
  },
});
