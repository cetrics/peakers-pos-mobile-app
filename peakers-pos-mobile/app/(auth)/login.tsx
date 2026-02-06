import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }

    setLoading(true);

    try {
      // Get the stored database name
      const dbName =
        (await AsyncStorage.getItem("db_name")) || "peakers_pos_test";

      const response = await fetch("http://192.168.1.66:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Database-Name": dbName, // Send database name in header
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.replace("/(tabs)/dashboard");
      } else {
        Alert.alert("Login Failed", data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Peakers POS</Text>

        <TextInput
          placeholder="Username"
          placeholderTextColor="#999"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "LOGGING IN..." : "LOGIN"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1c3d",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#f9a825",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
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
