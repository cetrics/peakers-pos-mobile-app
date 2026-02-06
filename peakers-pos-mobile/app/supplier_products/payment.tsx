import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";

const API = "http://192.168.1.66:5000";

interface PaymentResponse {
  balance_remaining: number;
  message?: string;
  success?: boolean;
}

const PaymentScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get data from navigation params
  const product = {
    supplier_product_id: Number(params.productId),
    product_name: params.productName as string,
    price: Number(params.price),
  };

  const supplierId = params.supplierId as string;

  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handlePayment = async () => {
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      Alert.alert("Error", "Enter a valid payment amount.");
      return;
    }

    if (!paymentMethod) {
      Alert.alert("Error", "Please select a payment method.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post<PaymentResponse>(
        `${API}/supplier-payments`,
        {
          supplier_id: supplierId,
          supplier_product_id: product.supplier_product_id,
          amount: parseFloat(amountPaid),
          payment_method: paymentMethod,
          reference,
        },
      );

      const balance = response.data.balance_remaining;

      setSuccessMessage(
        `Payment successful! Balance remaining: KSh ${balance}`,
      );

      // Clear fields
      setAmountPaid("");
      setReference("");

      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error: any) {
      Alert.alert(
        "Payment Failed",
        error.response?.data?.error || "Failed to process payment. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#0B1446" />
        </TouchableOpacity>
        <Text style={styles.title}>Make Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text style={styles.label}>Product:</Text>
          <Text style={styles.value}>{product.product_name}</Text>

          <Text style={styles.label}>Price:</Text>
          <Text style={styles.value}>KSh {product.price}</Text>
        </View>

        {/* Amount Input */}
        <Text style={styles.inputLabel}>Amount to Pay (Partial Allowed):</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          value={amountPaid}
          onChangeText={setAmountPaid}
          keyboardType="numeric"
        />

        {/* Payment Method */}
        <Text style={styles.inputLabel}>Payment Method:</Text>
        <View style={styles.methodContainer}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              paymentMethod === "Mpesa" && styles.methodButtonSelected,
            ]}
            onPress={() => setPaymentMethod("Mpesa")}
          >
            <Text
              style={[
                styles.methodText,
                paymentMethod === "Mpesa" && styles.methodTextSelected,
              ]}
            >
              Mpesa
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              paymentMethod === "Cash" && styles.methodButtonSelected,
            ]}
            onPress={() => setPaymentMethod("Cash")}
          >
            <Text
              style={[
                styles.methodText,
                paymentMethod === "Cash" && styles.methodTextSelected,
              ]}
            >
              Cash
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mpesa Reference */}
        {paymentMethod === "Mpesa" && (
          <View style={styles.referenceContainer}>
            <Text style={styles.inputLabel}>Mpesa Code:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Mpesa code"
              value={reference}
              onChangeText={setReference}
            />
          </View>
        )}

        {/* Success Message */}
        {successMessage ? (
          <View style={styles.successContainer}>
            <Icon name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!amountPaid || !paymentMethod || loading) &&
              styles.confirmButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!amountPaid || !paymentMethod || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Payment</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0B1446",
    textAlign: "center",
    flex: 1,
  },
  content: {
    padding: 16,
    flex: 1,
  },
  infoSection: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
    marginBottom: 12,
  },
  methodContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  methodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  methodButtonSelected: {
    backgroundColor: "#0B1446",
    borderColor: "#0B1446",
  },
  methodText: {
    fontSize: 16,
    color: "#666",
  },
  methodTextSelected: {
    color: "#fff",
    fontWeight: "500",
  },
  referenceContainer: {
    marginBottom: 12,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  successText: {
    marginLeft: 8,
    color: "#2e7d32",
    fontSize: 14,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: "#0B1446",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  confirmButtonDisabled: {
    backgroundColor: "#ccc",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default PaymentScreen;
